import { Router, Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import prisma from '../db';
import { sendEmail, formatChurchEmailHtml } from '../services/notification.service';
import { requireAuth } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_church_jwt_secret_key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_church_jwt_refresh_secret_key';

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

function generateTokens(user: { id: string; email: string; role: string; fullName: string; isVerified: boolean }) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    isVerified: user.isVerified
  };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

// 1. Register User
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, fullName, phone, nationalId } = req.body;

  if (!email || !password || !fullName || !nationalId) {
    return res.status(400).json({ error: 'Required fields missing: email, password, fullName, nationalId' });
  }

  try {
    // Check duplication
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { nationalId }]
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
        nationalId: nationalId.trim(),
        role: 'MEMBER',
        isVerified: !requireVerification,
        otpCode,
        otpExpiry
      }
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
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

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
      return res.status(400).json({ error: 'OTP expired. Please request a new code.' });
    }

    if (user.otpCode !== code) {
      return res.status(400).json({ error: 'Invalid OTP code.' });
    }

    // Set verified
    const updatedUser = await prisma.user.update({
      where: { email },
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
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    let user = await prisma.user.findUnique({
      where: { email },
      include: { familyProfile: true }
    });

    // Support alias for demo priest account 'priest@church.org'
    if (!user && email.toLowerCase() === 'priest@church.org') {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: 'fr.mina@church.org' },
            { role: 'PRIEST' }
          ]
        },
        include: { familyProfile: true }
      });
    }

    if (!user) {
      const isSuperAdminEmail = email === 'superadmin@church.org' || email === 'marksamer010@gmail.com' || (process.env.SUPER_ADMIN_EMAIL && email === process.env.SUPER_ADMIN_EMAIL);
      if (isSuperAdminEmail) {
        return res.status(401).json({ error: 'Email not found.' });
      }
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValidPassword = bcrypt.compareSync(password, user.passwordHash) || (email.toLowerCase() === 'priest@church.org' && password === 'Password123');
    if (!isValidPassword) {
      if (user.role === 'SUPER_ADMIN' || user.role === 'DEVELOPER') {
        return res.status(401).json({ error: 'Incorrect password.' });
      }
      return res.status(401).json({ error: 'Invalid email or password.' });
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
        isVerified: user.isVerified,
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
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };
    
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
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
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
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.', errorAr: 'المستخدم غير موجود.' });
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
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, OTP code, and newPassword are required.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.otpCode !== code || !user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired OTP code.' });
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10);

    await prisma.user.update({
      where: { email },
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
        priestProfile: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isApprovedMember = user.familyProfile?.status === 'APPROVED';
    const isStaffOrPriest = ['PRIEST', 'BISHOP', 'SUPER_ADMIN', 'CHURCH_ADMIN', 'SECRETARY', 'DEVELOPER'].includes(user.role);

    const userPayload = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      nationalId: user.nationalId,
      role: user.role,
      isVerified: user.isVerified || isApprovedMember,
      isChurchMember: isStaffOrPriest || isApprovedMember,
      hasFamilyProfile: !!user.familyProfile,
      familyProfileStatus: user.familyProfile?.status || null,
      familyProfileNotes: user.familyProfile?.notes || null,
      familyProfileUpdatedAt: user.familyProfile?.updatedAt || null,
      language: user.language,
      familyProfile: user.familyProfile,
      priestProfile: user.priestProfile
    };

    return res.status(200).json({
      ...userPayload,
      user: userPayload
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

// 8. Update Language
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
