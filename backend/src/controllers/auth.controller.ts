import { Router, Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import prisma from '../db';
import { sendEmail } from '../services/notification.service';
import { requireAuth } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_church_jwt_secret_key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_church_jwt_refresh_secret_key';

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
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
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
    const otpCode = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        phone,
        nationalId,
        role: 'MEMBER',
        isVerified: false,
        otpCode,
        otpExpiry
      }
    });

    // Send OTP
    await sendEmail(
      email,
      'Church Platform — Verify Email OTP',
      `<p>Welcome to our Church Platform, <b>${fullName}</b>.</p>
       <p>Your verification OTP is: <h2 style="color: #2F3E46; letter-spacing: 2px;">${otpCode}</h2></p>
       <p>This code expires in 10 minutes.</p>`
    );

    return res.status(201).json({
      message: 'Registration successful. OTP code sent to your email.',
      email: user.email
    });
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
    const user = await prisma.user.findUnique({
      where: { email },
      include: { familyProfile: true }
    });

    if (!user) {
      const isSuperAdminEmail = email === 'superadmin@church.org' || (process.env.SUPER_ADMIN_EMAIL && email === process.env.SUPER_ADMIN_EMAIL);
      if (isSuperAdminEmail) {
        return res.status(401).json({ error: 'Email not found.' });
      }
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValidPassword = bcrypt.compareSync(password, user.passwordHash);
    if (!isValidPassword) {
      if (user.role === 'SUPER_ADMIN') {
        return res.status(401).json({ error: 'Incorrect password.' });
      }
      return res.status(401).json({ error: 'Invalid email or password.' });
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
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Security rule: don't reveal if user exists, but we are a closed church system,
      // let's return success message regardless or warning. Let's return success for security.
      return res.status(200).json({ message: 'If this email exists, a password reset code was sent.' });
    }

    const otpCode = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: { otpCode, otpExpiry }
    });

    await sendEmail(
      email,
      'Church Platform — Reset Password Code',
      `<p>Hello,</p>
       <p>You requested a password reset for your Church Platform account.</p>
       <p>Your reset OTP is: <h2 style="color: #c1121f; letter-spacing: 2px;">${otpCode}</h2></p>
       <p>If you did not request this, please ignore this email.</p>`
    );

    return res.status(200).json({ message: 'If this email exists, a password reset code was sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Server error during forgot password process.' });
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

    return res.status(200).json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      nationalId: user.nationalId,
      role: user.role,
      isVerified: user.isVerified,
      language: user.language,
      familyProfile: user.familyProfile,
      priestProfile: user.priestProfile
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
