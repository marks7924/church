import { Router, Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import prisma from '../db';
import { sendEmail, formatChurchEmailHtml } from '../services/notification.service';
import { requireAuth } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import { validateAndParseEgyptianNationalId, maskEgyptianNationalId } from '../utils/nationalId';
import { getCanonicalFamilyMembership } from '../services/familyMembership.service';

const router = Router();

import {
  getJwtSecret,
  getJwtRefreshSecret,
  enforceRateLimit,
  recordOtpFailure,
  resetOtpAttempts,
  getOtpFailures
} from '../utils/security';

async function isEmailVerificationRequired(): Promise<boolean> {
  const config = await prisma.systemConfig.findUnique({
    where: { key: 'require_email_verification' }
  });
  // Default to true (mandatory email verification)
  return config ? config.value === 'true' : true;
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateTokens(user: { id: string; email: string; role: any; roles?: any[]; fullName: string; isVerified: boolean; isBanned?: boolean }) {
  const userRoles = (user.roles && Array.isArray(user.roles) && user.roles.length > 0) ? user.roles : [user.role];
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    roles: userRoles,
    fullName: user.fullName,
    isVerified: user.isVerified,
    isBanned: !!user.isBanned
  };
  const accessToken = jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
  const refreshToken = jwt.sign({ userId: user.id }, getJwtRefreshSecret(), { expiresIn: '7d' });
  return { accessToken, refreshToken, roles: userRoles };
}

// 1. Register User
router.post('/register', async (req: Request, res: Response) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'anonymous';
  const rateLimit = enforceRateLimit(`register:${clientIp}`, { limit: 10, windowMs: 60 * 60 * 1000, blockDurationMs: 60 * 60 * 1000 });
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: `Too many registration attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
      errorAr: 'تم تجاوز الحد المسموح به من محاولات التسجيل. يرجى المحاولة لاحقاً.'
    });
  }

  const { email, password, fullName, phone, nationalId } = req.body;

  if (!email || !password || !fullName || !nationalId) {
    return res.status(400).json({ error: 'Required fields missing: email, password, fullName, nationalId' });
  }

  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters long.',
      errorAr: 'يجب ألا تقل كلمة المرور عن 8 أحرف.'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'Invalid email address format.', errorAr: 'صيغة البريد الإلكتروني غير صالحة.' });
  }

  try {
    // Check duplication
    const cleanEmail = email.trim().toLowerCase();
    const cleanNationalId = nationalId.trim();

    // Authoritative Egyptian National ID Validation
    const natIdValidation = validateAndParseEgyptianNationalId(cleanNationalId);
    if (!natIdValidation.isValid) {
      return res.status(400).json({
        error: natIdValidation.error || 'Invalid Egyptian National ID.',
        errorAr: natIdValidation.errorAr || 'الرقم القومي المصري غير صالح.'
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: cleanEmail }, { nationalId: cleanNationalId }]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email or National ID already registered.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const requireVerification = await isEmailVerificationRequired();
    const otpCode = generateOTP();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash,
        fullName: fullName.trim(),
        phone: phone ? phone.trim() : null,
        nationalId: cleanNationalId,
        role: 'MEMBER',
        isVerified: !requireVerification,
        otpCode,
        otpExpiry
      }
    });

    // Automatically check and link to canonical family membership if registered under family head
    getCanonicalFamilyMembership(user.id).catch(err => {
      console.error('Error auto-linking family membership upon registration:', err);
    });

    if (requireVerification) {
      // Send email verification with OTP
      const emailHtml = formatChurchEmailHtml({
        titleAr: 'تأكيد وتفعيل بريدك الإلكتروني',
        titleEn: 'Email Verification Code',
        badge: 'رمز التفعيل',
        badgeColor: '#b45309',
        contentHtml: `
          <p>أهلاً بك يا <b>${fullName}</b> في المنظومة الرقمية لكنيسة الشهيد العظيم أبي سيفين بحدائق القبة.</p>
          <p>لإتمام عملية التسجيل وتفعيل حسابك بنجاح، يرجى إدخال رمز التحقق التالي:</p>
          <div style="text-align: center; margin: 24px 0;">
            <div style="display: inline-block; background-color: #f8fafc; border: 2px dashed #d97706; padding: 14px 28px; border-radius: 12px;">
              <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #b45309; font-family: monospace;">${otpCode}</span>
            </div>
          </div>
          <p style="font-size: 13px; color: #64748b; text-align: center;">صلاحية هذا الرمز هي <b>15 دقيقة</b> من وقت إرساله.</p>
        `
      });

      sendEmail(
        email,
        'كود تفعيل حسابك — كنيسة الشهيد أبي سيفين',
        emailHtml
      ).catch(err => {
        console.error('Background verification email failed during registration:', err);
      });

      return res.status(201).json({
        message: 'Registration successful. Verification required.',
        messageAr: 'تم إنشاء الحساب بنجاح! تم إرسال كود التحقق لبريدك الإلكتروني (يرجى مراجعة صندوق الوارد أو مجلد Spam).',
        email: user.email,
        requireVerification: true
      });
    } else {
      // Direct welcome email
      const emailHtml = formatChurchEmailHtml({
        titleAr: 'مرحباً بك في كنيسة الشهيد العظيم أبي سيفين',
        titleEn: 'Welcome to Church Platform',
        badge: 'حساب مفعل',
        badgeColor: '#16a34a',
        contentHtml: `
          <p>مرحباً بك يا <b>${fullName}</b> في منظومة الكنيسة الرقمية.</p>
          <p>تم تسجيل وتفعيل حسابك بنجاح، ويمكنك الآن تسجيل الدخول مباشرة.</p>
        `
      });
      sendEmail(email, 'مرحباً بك في كنيسة الشهيد أبي سيفين', emailHtml).catch(err => {
        console.error('Welcome email dispatch failed:', err);
      });

      return res.status(201).json({
        message: 'Registration successful.',
        messageAr: 'تم إنشاء الحساب وتفعيله بنجاح! يمكنك الآن تسجيل الدخول.',
        email: user.email,
        requireVerification: false
      });
    }
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
});

// 2. Verify OTP
router.post('/verify-otp', async (req: Request, res: Response) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'anonymous';
  const rateLimit = enforceRateLimit(`verify-otp:${clientIp}`, { limit: 15, windowMs: 60 * 1000, blockDurationMs: 5 * 60 * 1000 });
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: `Too many OTP verification attempts. Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`,
      errorAr: 'تم تجاوز الحد الأقصى لمحاولات التحقق. يرجى الانتظار والمحاولة مرة أخرى.'
    });
  }

  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required.' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'User is already verified.' });
    }

    if (!user.otpCode || !user.otpExpiry) {
      return res.status(400).json({ error: 'No active OTP. Please request a new code.' });
    }

    if (user.otpExpiry < new Date()) {
      resetOtpAttempts(cleanEmail);
      return res.status(400).json({ error: 'OTP expired. Please request a new code.' });
    }

    if (user.otpCode !== String(code).trim()) {
      const failures = recordOtpFailure(cleanEmail);
      if (failures >= 5) {
        // Invalidate OTP on 5th failed attempt to prevent brute force
        await prisma.user.update({
          where: { email: cleanEmail },
          data: { otpCode: null, otpExpiry: null }
        });
        resetOtpAttempts(cleanEmail);
        return res.status(400).json({
          error: 'Too many invalid attempts. For your security, this verification code has been invalidated. Please request a new code.',
          errorAr: 'تم إدخال الرمز خطأ 5 مرات. تم إلغاء صلاحية هذا الرمز لحماية حسابك، يرجى طلب كود جديد.'
        });
      }

      const remaining = 5 - failures;
      return res.status(400).json({
        error: `Invalid OTP code. ${remaining} attempts remaining before code is invalidated.`,
        errorAr: `كود التحقق غير صحيح. متبقي ${remaining} محاولات قبل إلغاء الرمز.`
      });
    }

    // Success: reset attempts
    resetOtpAttempts(cleanEmail);

    // Set verified
    const updatedUser = await prisma.user.update({
      where: { email: cleanEmail },
      data: {
        isVerified: true,
        otpCode: null,
        otpExpiry: null
      }
    });

    const tokens = generateTokens(updatedUser);
    await prisma.user.update({
      where: { email },
      data: { refreshToken: tokens.refreshToken }
    });

    return res.status(200).json({
      message: 'Email verified successfully.',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        role: updatedUser.role,
        isVerified: updatedUser.isVerified
      },
      ...tokens
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    return res.status(500).json({ error: 'Server error during OTP verification.' });
  }
});

// 3. Login
router.post('/login', async (req: Request, res: Response) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'anonymous';
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required.',
      errorAr: 'يرجى إدخال البريد الإلكتروني وكلمة المرور.'
    });
  }

  const cleanEmail = String(email).trim().toLowerCase();

  // Rate Limiting & Account Lockout: Max 10 attempts per 15 minutes per IP/Email
  const rateLimit = enforceRateLimit(`login:${clientIp}:${cleanEmail}`, {
    limit: 10,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: 15 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: `Too many failed login attempts. Account temporarily locked. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
      errorAr: `تم تجاوز عدد المحاولات الخاطئة. تم إيقاف تسجيل الدخول مؤقتاً لمدة ${Math.ceil((rateLimit.retryAfterSeconds || 60) / 60)} دقيقة للحماية.`
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { familyProfile: true }
    });

    // Constant-time-like uniform error response to prevent user enumeration
    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password.',
        errorAr: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
      });
    }

    // Verify password strictly against bcrypt hash (NO BACKDOORS ALLOWED)
    const isValidPassword = bcrypt.compareSync(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid email or password.',
        errorAr: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
      });
    }

    // Check account ban status
    if (user.isBanned) {
      return res.status(403).json({
        error: 'ACCOUNT_BANNED',
        errorAr: `تم حظر هذا الحساب من قِبل إدارة الكنيسة${user.banReason ? ` (السبب: ${user.banReason})` : ''}. يرجى مراجعة إدارة الكنيسة.`,
        errorEn: 'Your account has been suspended by church administration. Please contact the church administration.'
      });
    }

    // Check if email verification is mandatory
    const requireVerification = await isEmailVerificationRequired();
    const isExemptRole = ['SUPER_ADMIN', 'DEVELOPER', 'PRIEST', 'BISHOP'].includes(user.role);
    
    if (!user.isVerified && requireVerification && !isExemptRole) {
      // Re-generate OTP code and send to user
      const otpCode = generateOTP();
      const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: { otpCode, otpExpiry }
      });

      const verifyEmailHtml = formatChurchEmailHtml({
        titleAr: 'تأكيد وتفعيل بريدك الإلكتروني',
        titleEn: 'Account Verification Code',
        badge: 'رمز التفعيل',
        badgeColor: '#b45309',
        contentHtml: `
          <p>أهلاً بك يا <b>${user.fullName}</b>،</p>
          <p>يرجى إدخال رمز التحقق (OTP) التالي لتفعيل بريدك الإلكتروني والتمكن من الدخول إلى حسابك:</p>
          <div style="text-align: center; margin: 24px 0;">
            <div style="display: inline-block; background-color: #f8fafc; border: 2px dashed #d97706; padding: 14px 28px; border-radius: 12px;">
              <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #b45309; font-family: monospace;">${otpCode}</span>
            </div>
          </div>
          <p style="font-size: 13px; color: #64748b; text-align: center;">صلاحية هذا الرمز هي <b>15 دقيقة</b> من وقت إرساله.</p>
        `
      });

      sendEmail(user.email, 'كود تفعيل حسابك — كنيسة الشهيد أبي سيفين', verifyEmailHtml).catch(err => {
        console.error('Failed to send login verification email:', err);
      });

      return res.status(403).json({
        error: 'EMAIL_NOT_VERIFIED',
        errorAr: 'يرجى تفعيل بريدك الإلكتروني أولاً برمز التحقق (تم إرسال كود لبريدك الإلكتروني، يرجى مراجعة صندوق الوارد أو مجلد Spam).',
        errorEn: 'Please verify your email address first using the verification code sent to your email (check Inbox or Spam folder).',
        email: user.email,
        requireVerification: true
      });
    }

    const tokens = generateTokens(user);
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken }
    });

    return res.status(200).json({
      message: 'Login successful.',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        roles: tokens.roles,
        isVerified: user.isVerified,
        isBanned: user.isBanned,
        hasFamilyProfile: !!user.familyProfile,
        familyProfileStatus: user.familyProfile?.status || null
      },
      ...tokens
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error during login.' });
  }
});

// 4. Refresh Token
router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required.' });
  }

  try {
    const decoded = jwt.verify(refreshToken, getJwtRefreshSecret()) as { userId: string };
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ error: 'Invalid refresh token.' });
    }

    const tokens = generateTokens(user);
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken }
    });

    return res.status(200).json({
      ...tokens
    });
  } catch (error) {
    return res.status(401).json({ error: 'Expired or invalid refresh token.' });
  }
});

// 5. Forgot Password
router.post('/forgot-password', async (req: Request, res: Response) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'anonymous';
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Rate Limiting: Max 3 requests per 15 minutes per IP/Email to stop spam and quota exhaustion
  const rateLimit = enforceRateLimit(`forgot-pw:${clientIp}:${cleanEmail}`, {
    limit: 3,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: 15 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: `Too many password reset requests. Please wait ${rateLimit.retryAfterSeconds} seconds before requesting again.`,
      errorAr: 'تم إرسال عدة طلبات لاستعادة كلمة المرور. يرجى الانتظار والمحاولة لاحقاً.'
    });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      return res.status(200).json({
        message: 'If this email exists, a password reset code was sent.',
        messageAr: 'إذا كان هذا البريد مسجلاً لدينا، فقد تم إرسال كود الاستعادة (يرجى فحص صندوق الوارد أو مجلد Spam).'
      });
    }

    const otpCode = generateOTP();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.user.update({
      where: { email: cleanEmail },
      data: { otpCode, otpExpiry }
    });

    const resetHtml = formatChurchEmailHtml({
      titleAr: 'طلب استعادة وإعادة تعيين كلمة المرور',
      titleEn: 'Password Reset Request',
      badge: 'استعادة الحساب',
      badgeColor: '#dc2626',
      contentHtml: `
        <p>مرحباً بك يا <b>${user.fullName}</b>،</p>
        <p>لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في المنظومة الرقمية لكنيسة الشهيد أبي سيفين.</p>
        <p>رمز التأكيد الخاص بك هو:</p>
        <div style="text-align: center; margin: 24px 0;">
          <div style="display: inline-block; background-color: #fef2f2; border: 2px dashed #dc2626; padding: 14px 28px; border-radius: 12px;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #dc2626; font-family: monospace;">${otpCode}</span>
          </div>
        </div>
        <p style="font-size: 13px; color: #64748b; text-align: center;">صلاحية هذا الرمز هي <b>15 دقيقة</b> فقط.</p>
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">إذا لم تكن قد طلبت استعادة كلمة المرور بنفسك، يمكنك تجاهل هذا الإيميل ولن يتم تعديل أي بيانات في حسابك.</p>
      `
    });

    await sendEmail(
      cleanEmail,
      'كود استعادة كلمة المرور — كنيسة الشهيد أبي سيفين',
      resetHtml
    );

    return res.status(200).json({
      message: 'If this email exists, a password reset code was sent.',
      messageAr: 'تم إرسال كود استعادة كلمة المرور إلى بريدك الإلكتروني (يرجى مراجعة صندوق الوارد أو مجلد Spam).'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Server error during forgot password process.' });
  }
});

// 5b. Resend OTP Code
router.post('/resend-otp', async (req: Request, res: Response) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'anonymous';
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Rate Limiting: Max 3 resend attempts per 15 minutes per IP/Email
  const rateLimit = enforceRateLimit(`resend-otp:${clientIp}:${cleanEmail}`, {
    limit: 3,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: 15 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: `Too many resend requests. Please wait ${rateLimit.retryAfterSeconds} seconds before requesting a new code.`,
      errorAr: 'تم إرسال عدة طلبات لإعادة إرسال الكود. يرجى الانتظار والمحاولة لاحقاً.'
    });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      // Return 200 to prevent user enumeration
      return res.status(200).json({
        success: true,
        messageAr: 'إذا كان البريد مسجلاً، تم إرسال كود تحقق جديد بنجاح.'
      });
    }

    const otpCode = generateOTP();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { email: cleanEmail },
      data: { otpCode, otpExpiry }
    });

    const emailHtml = formatChurchEmailHtml({
      titleAr: 'رمز التحقق الجديد لحسابك',
      titleEn: 'New Verification Code',
      badge: 'رمز جديد',
      badgeColor: '#b45309',
      contentHtml: `
        <p>أهلاً بك يا <b>${user.fullName}</b>،</p>
        <p>طلبك لرمز تحقق جديد تم تنفيذه بنجاح. رمزك الجديد هو:</p>
        <div style="text-align: center; margin: 24px 0;">
          <div style="display: inline-block; background-color: #f8fafc; border: 2px dashed #d97706; padding: 14px 28px; border-radius: 12px;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #b45309; font-family: monospace;">${otpCode}</span>
          </div>
        </div>
        <p style="font-size: 13px; color: #64748b; text-align: center;">صلاحية هذا الرمز هي <b>15 دقيقة</b>.</p>
      `
    });

    await sendEmail(cleanEmail, 'كود تحقق جديد — كنيسة الشهيد أبي سيفين', emailHtml);

    return res.status(200).json({
      success: true,
      messageAr: 'تم إرسال كود تحقق جديد بنجاح (يرجى التحقق من Inbox أو Spam).'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to resend code.' });
  }
});

// 6. Reset Password
router.post('/reset-password', async (req: Request, res: Response) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'anonymous';
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, OTP code, and newPassword are required.' });
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({
      error: 'New password must be at least 8 characters long.',
      errorAr: 'يجب ألا تقل كلمة المرور الجديدة عن 8 أحرف.'
    });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Rate Limiting: Max 5 attempts per 15 minutes
  const rateLimit = enforceRateLimit(`reset-pw:${clientIp}:${cleanEmail}`, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: 15 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: `Too many password reset attempts. Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`,
      errorAr: 'تم تجاوز عدد محاولات إعادة تعيين كلمة المرور. يرجى الانتظار والمحاولة لاحقاً.'
    });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user || user.otpCode !== String(code).trim() || !user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired OTP code.', errorAr: 'كود التأكيد غير صحيح أو منتهي الصلاحية.' });
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10);

    await prisma.user.update({
      where: { email: cleanEmail },
      data: {
        passwordHash,
        otpCode: null,
        otpExpiry: null
      }
    });

    return res.status(200).json({ message: 'Password reset successfully. You can now login.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Server error during password reset.' });
  }
});

// 7. Get Current User Info
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        familyProfile: true,
        linkedFamilyHead: true,
        priestProfile: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Resolve Canonical Shared Family Membership (Head or Member)
    const canonicalFamily = await getCanonicalFamilyMembership(user.id);

    // Derived Egyptian National ID Fields (authoritative, dynamic)
    const natIdResult = validateAndParseEgyptianNationalId(user.nationalId);

    const isApprovedMember = canonicalFamily.status === 'APPROVED';
    const isStaffOrPriest = ['PRIEST', 'BISHOP', 'SUPER_ADMIN', 'CHURCH_ADMIN', 'SECRETARY', 'DEVELOPER'].includes(user.role);

    // Fetch live statistics backed by real database data
    const [upcomingAppointmentsCount, activeInvitationsCount] = await Promise.all([
      prisma.appointment.count({
        where: {
          memberId: user.id,
          date: { gte: new Date() },
          status: { in: ['PENDING', 'APPROVED'] }
        }
      }),
      prisma.eventInvitation.count({
        where: {
          userId: user.id,
          status: 'ACTIVE'
        }
      })
    ]);

    const userPayload = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      nationalId: user.nationalId,
      maskedNationalId: natIdResult.isValid ? natIdResult.maskedId : (user.nationalId ? maskEgyptianNationalId(user.nationalId) : null),
      avatarUrl: user.avatarUrl || null,
      role: user.role,
      roles: Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role],
      isBanned: user.isBanned || false,
      banReason: user.banReason || null,
      isVerified: user.isVerified || isApprovedMember,
      isChurchMember: isStaffOrPriest || isApprovedMember,
      memberSince: user.createdAt,
      language: user.language,
      notificationPreferences: user.notificationPreferencesJson 
        ? JSON.parse(user.notificationPreferencesJson) 
        : { email: true, sms: true, events: true, reminders: true },
      
      // Authoritative Derived Identity Fields (Read-Only)
      derivedIdentity: {
        isValid: natIdResult.isValid,
        dateOfBirth: natIdResult.dateOfBirth || null,
        birthDateFormatted: natIdResult.birthDateString || null,
        age: natIdResult.age !== undefined ? natIdResult.age : null,
        gender: natIdResult.gender || null,
        genderAr: natIdResult.genderAr || null,
        genderEn: natIdResult.genderEn || null,
        governorateNameAr: natIdResult.governorateNameAr || null,
        maskedNationalId: natIdResult.maskedId || null
      },

      // Canonical Shared Family Membership Details (covers whole family)
      familyMembership: canonicalFamily,
      hasFamilyProfile: canonicalFamily.hasMembership,
      familyProfileStatus: canonicalFamily.hasMembership ? canonicalFamily.status : null,
      familyProfileNotes: canonicalFamily.notes,
      familyProfileUpdatedAt: canonicalFamily.updatedAt,

      // Live Backed Stats
      stats: {
        upcomingAppointmentsCount,
        activeInvitationsCount,
        unreadNotificationsCount: 0
      },

      priestProfile: user.priestProfile
    };

    return res.status(200).json({
      ...userPayload,
      user: userPayload
    });
  } catch (error) {
    console.error('Error fetching /auth/me profile:', error);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// 8. Update Profile (Editable fields only - locked fields strictly protected)
router.patch('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const {
    fullName,
    phone,
    avatarUrl,
    language,
    notificationPreferences,
    // Disallowed locked fields if client attempts to alter them:
    nationalId,
    role,
    roles,
    isVerified,
    isBanned,
    dateOfBirth,
    gender,
    age,
    familyProfileStatus
  } = req.body;

  // Strict enforcement of locked identity fields
  if (
    nationalId !== undefined ||
    role !== undefined ||
    roles !== undefined ||
    isVerified !== undefined ||
    isBanned !== undefined ||
    dateOfBirth !== undefined ||
    gender !== undefined ||
    age !== undefined ||
    familyProfileStatus !== undefined
  ) {
    return res.status(400).json({
      error: 'Identity, role, and membership fields are locked for security and cannot be directly modified.',
      errorAr: 'بيانات الهوية (الرقم القومي، تاريخ الميلاد، العمر، النوع)، الرتبة، وحالة العضوية مقفلة ومحمية لأسباب أمنية. يرجى تقديم طلب تصحيح رسمي للإدارة إذا لزم الأمر.'
    });
  }

  const updateData: any = {};

  if (fullName !== undefined) {
    const cleanName = String(fullName).trim();
    if (cleanName.length < 3 || cleanName.length > 100) {
      return res.status(400).json({
        error: 'Full name must be between 3 and 100 characters.',
        errorAr: 'يجب أن يتكون الاسم الكامل من 3 إلى 100 حرف.'
      });
    }
    updateData.fullName = cleanName;
  }

  if (phone !== undefined) {
    const cleanPhone = String(phone).trim();
    if (cleanPhone && !/^[0-9+\s-]{8,20}$/.test(cleanPhone)) {
      return res.status(400).json({
        error: 'Invalid phone number format.',
        errorAr: 'صيغة رقم الهاتف غير صالحة.'
      });
    }
    updateData.phone = cleanPhone || null;
  }

  if (avatarUrl !== undefined) {
    if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        error: 'Avatar image size exceeds the allowed limit (5MB).',
        errorAr: 'حجم الصورة الشخصية يتجاوز الحد المسموح به (5 ميجابايت).'
      });
    }
    updateData.avatarUrl = avatarUrl || null;
  }

  if (language !== undefined) {
    if (language !== 'ar' && language !== 'en') {
      return res.status(400).json({ error: 'Language must be "ar" or "en".' });
    }
    updateData.language = language;
  }

  if (notificationPreferences !== undefined) {
    updateData.notificationPreferencesJson = JSON.stringify(notificationPreferences);
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    return res.status(200).json({
      message: 'Profile updated successfully.',
      messageAr: 'تم تحديث الملف الشخصي بنجاح.',
      user: {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        phone: updatedUser.phone,
        avatarUrl: updatedUser.avatarUrl,
        language: updatedUser.language
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ error: 'Server error updating profile.' });
  }
});

// 9. Request Locked Field Correction (Official Administrative Review Request)
router.post('/request-identity-correction', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { fieldName, requestedValue, reason } = req.body;

  if (!fieldName || !requestedValue || !reason) {
    return res.status(400).json({
      error: 'Missing required correction fields: fieldName, requestedValue, reason.',
      errorAr: 'يرجى استيفاء جميع البيانات المطلوبة لطلب التصحيح (الحقل المراد تعديله، القيمة الصحيحة، وسبب التصحيح).'
    });
  }

  const cleanField = String(fieldName).trim();
  const cleanRequestedValue = String(requestedValue).trim();
  const cleanReason = String(reason).trim();

  if (cleanReason.length < 10) {
    return res.status(400).json({
      error: 'Please provide a detailed explanation of the correction (minimum 10 characters).',
      errorAr: 'يرجى تقديم شرح واضح ومفصل لسبب التصحيح (10 أحرف على الأقل).'
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) return res.status(404).json({ error: 'User not found.' });

    const referenceCode = `CORR-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    await prisma.aiSupportRequest.create({
      data: {
        referenceCode,
        userId: user.id,
        name: user.fullName,
        phone: user.phone || 'N/A',
        email: user.email,
        category: 'IDENTITY_CORRECTION',
        message: `طلب رسمي لتصحيح بيانات هوية مقفلة:
- الحقل المطلوب تعديله: ${cleanField}
- القيمة الصحيحة المطلوبة: ${cleanRequestedValue}
- شرح ومبررات العضو: ${cleanReason}`,
        status: 'PENDING',
        notes: `User ID: ${user.id} | Current National ID: ${user.nationalId ? maskEgyptianNationalId(user.nationalId) : 'N/A'}`
      }
    });

    // Send official notification email to the church's configured support address
    const officialSupportEmail = process.env.SMTP_USER || 'churchsplatform@gmail.com';
    const emailHtml = formatChurchEmailHtml({
      titleAr: 'طلب جديد لتصحيح بيانات هوية عضو',
      titleEn: 'Official Identity Correction Request',
      badge: 'إدارة الهوية',
      badgeColor: '#b45309',
      contentHtml: `
        <p>ورد طلب رسمي من أحد الأعضاء لتصحيح بيانات هوية مقفلة في المنظومة:</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p><b>رقم المرجع:</b> ${referenceCode}</p>
          <p><b>اسم العضو:</b> ${user.fullName}</p>
          <p><b>البريد الإلكتروني:</b> ${user.email}</p>
          <p><b>رقم الهاتف:</b> ${user.phone || 'غير مسجل'}</p>
          <p><b>الحقل المطلوب تصحيحه:</b> ${cleanField}</p>
          <p><b>القيمة الصحيحة المطلوبة:</b> ${cleanRequestedValue}</p>
          <p><b>شرح ومبررات العضو:</b> ${cleanReason}</p>
        </div>
        <p style="font-size: 13px; color: #64748b;">يتطلب اعتماد هذا الطلب فحص ومطابقة المستندات والبطاقة الشخصية بمعرفة الأمانة أو الكاهن المسئول.</p>
      `
    });

    sendEmail(
      officialSupportEmail,
      `طلب تصحيح بيانات هوية: ${user.fullName} (${referenceCode})`,
      emailHtml
    ).catch(err => console.error('Failed to notify support email of correction request:', err));

    return res.status(200).json({
      success: true,
      referenceCode,
      message: 'Correction request submitted successfully for administrative review.',
      messageAr: `تم إرسال طلب تصحيح البيانات بنجاح للأمانة العامة للكنيسة برقم مرجعي (${referenceCode}). سيتم مراجعة الطلب والمستندات والتواصل معكم.`
    });
  } catch (error) {
    console.error('Error submitting correction request:', error);
    return res.status(500).json({ error: 'Server error submitting correction request.' });
  }
});

// 10. Update Language
router.patch('/language', requireAuth, async (req: AuthRequest, res: Response) => {
  const { language } = req.body;
  if (language !== 'ar' && language !== 'en') {
    return res.status(400).json({ error: 'Invalid language. Must be "ar" or "en".' });
  }

  try {
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { language }
    });
    return res.status(200).json({ message: 'Language updated successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
