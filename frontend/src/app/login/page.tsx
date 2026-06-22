'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../../components/ThemeContext';
import styles from './login.module.css';
import { Eye, EyeOff, Lock, Mail, User, Phone, CreditCard, ShieldAlert } from 'lucide-react';
import { API_URL } from '../../config';

type AuthMode = 'login' | 'register' | 'otp' | 'forgot' | 'reset';

export default function LoginPage() {
  const { language, t } = useTheme();
  const router = useRouter();
  
  // Navigation Modes
  const [mode, setMode] = useState<AuthMode>('login');
  
  // Form Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Quick Demo Accounts login function
  const handleDemoLogin = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('Password123');
    setMode('login');
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      let endpoint = '';
      let body: any = {};

      if (mode === 'login') {
        endpoint = '/api/auth/login';
        body = { email, password };
      } else if (mode === 'register') {
        endpoint = '/api/auth/register';
        body = { email, password, fullName, phone, nationalId };
      } else if (mode === 'otp') {
        endpoint = '/api/auth/verify-otp';
        body = { email, code: otpCode };
      } else if (mode === 'forgot') {
        endpoint = '/api/auth/forgot-password';
        body = { email };
      } else if (mode === 'reset') {
        endpoint = '/api/auth/reset-password';
        body = { email, code: otpCode, newPassword };
      }

      const res = await fetch(`${API_URL}${endpoint.replace('/api', '')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Server error occurred.');
      }

      // Success flows
      if (mode === 'login') {
        localStorage.setItem('church-token', data.accessToken);
        localStorage.setItem('church-refresh-token', data.refreshToken);
        localStorage.setItem('church-user', JSON.stringify(data.user));
        
        // Dispatch event to update navbar
        window.dispatchEvent(new Event('auth-change'));
        
        setSuccessMsg(language === 'ar' ? 'تم تسجيل الدخول بنجاح!' : 'Logged in successfully!');
        setTimeout(() => router.push('/'), 1000);
      } else if (mode === 'register') {
        setSuccessMsg(language === 'ar' ? 'تم إرسال كود الـ OTP لبريدك الإلكتروني.' : 'OTP code sent to your email.');
        setMode('otp');
      } else if (mode === 'otp') {
        localStorage.setItem('church-token', data.accessToken);
        localStorage.setItem('church-refresh-token', data.refreshToken);
        localStorage.setItem('church-user', JSON.stringify(data.user));
        
        window.dispatchEvent(new Event('auth-change'));
        setSuccessMsg(language === 'ar' ? 'تم تفعيل الحساب بنجاح!' : 'Account verified successfully!');
        setTimeout(() => router.push('/'), 1000);
      } else if (mode === 'forgot') {
        setSuccessMsg(language === 'ar' ? 'تم إرسال كود إعادة التعيين لبريدك.' : 'Reset code sent to your email.');
        setMode('reset');
      } else if (mode === 'reset') {
        setSuccessMsg(language === 'ar' ? 'تم إعادة تعيين كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول.' : 'Password reset successfully! You can now login.');
        setMode('login');
      }

    } catch (err: any) {
      let msg = err.message || 'Server connection failed.';
      if (msg === 'Email not found.') {
        msg = language === 'ar' ? 'البريد الإلكتروني لمدير النظام غير موجود.' : 'Super Admin email not found.';
      } else if (msg === 'Incorrect password.') {
        msg = language === 'ar' ? 'كلمة المرور لمدير النظام غير صحيحة.' : 'Super Admin password incorrect.';
      } else if (msg === 'Invalid email or password.') {
        msg = language === 'ar' ? 'البريد الإلكتروني أو كلمة المرور غير صالحة.' : 'Invalid email or password.';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { nameAr: 'عضو', nameEn: 'Member', email: 'member@church.org' },
    { nameAr: 'سكرتير', nameEn: 'Secretary', email: 'secretary@church.org' },
    { nameAr: 'مسؤول الرحلات', nameEn: 'Trip Manager', email: 'tripmanager@church.org' },
    { nameAr: 'كاهن الكنيسة', nameEn: 'Priest', email: 'priest@church.org' },
    { nameAr: 'الأنبا اثناسيوس (الأسقف)', nameEn: 'Bishop', email: 'bishop@church.org' },
    { nameAr: 'مسؤول الكنيسة', nameEn: 'Church Admin', email: 'admin@church.org' },
    { nameAr: 'مدير النظام', nameEn: 'Super Admin', email: 'superadmin@church.org' },
  ];

  return (
    <div className={styles.pageContainer}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', alignItems: 'center' }}>
        
        {/* Main Auth Form */}
        <div className={styles.authCard}>
          <h2 className={styles.authTitle}>
            {mode === 'login' && t('login')}
            {mode === 'register' && t('register')}
            {mode === 'otp' && t('verify_email')}
            {mode === 'forgot' && t('forgot_password')}
            {mode === 'reset' && t('reset_password')}
          </h2>
          <p className={styles.authSubtitle}>
            {mode === 'login' && (language === 'ar' ? 'سجل دخولك لتتمكن من حجز المواعيد والعضويات' : 'Login to book sessions and manage membership')}
            {mode === 'register' && (language === 'ar' ? 'أنشئ حساباً لربط أسرتك ببيانات الكنيسة' : 'Create an account to link your family with church records')}
            {mode === 'otp' && t('enter_otp')}
          </p>

          {errorMsg && (
            <div className={styles.errorBadge}>
              <ShieldAlert size={16} style={{ verticalAlign: 'middle', marginInlineEnd: '6px' }} />
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className={styles.successBadge}>
              {successMsg}
            </div>
          )}

          <form onSubmit={handleAuthSubmit}>
            {/* Full Name (Register mode only) */}
            {mode === 'register' && (
              <div className={styles.formGroup}>
                <label>{t('fullName')}</label>
                <div className={styles.inputWrapper}>
                  <User size={16} style={{ position: 'absolute', marginInlineStart: '12px', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    required
                    className={styles.authInput}
                    style={{ paddingInlineStart: '36px' }}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Email (Login, Register, Forgot, Reset modes) */}
            {mode !== 'otp' && (
              <div className={styles.formGroup}>
                <label>{t('email')}</label>
                <div className={styles.inputWrapper}>
                  <Mail size={16} style={{ position: 'absolute', marginInlineStart: '12px', color: 'var(--text-secondary)' }} />
                  <input
                    type="email"
                    required
                    className={styles.authInput}
                    style={{ paddingInlineStart: '36px' }}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={mode === 'reset'}
                  />
                </div>
              </div>
            )}

            {/* Phone (Register mode only) */}
            {mode === 'register' && (
              <div className={styles.formGroup}>
                <label>{t('phone')}</label>
                <div className={styles.inputWrapper}>
                  <Phone size={16} style={{ position: 'absolute', marginInlineStart: '12px', color: 'var(--text-secondary)' }} />
                  <input
                    type="tel"
                    required
                    className={styles.authInput}
                    style={{ paddingInlineStart: '36px' }}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* National ID (Register mode only) */}
            {mode === 'register' && (
              <div className={styles.formGroup}>
                <label>{t('nationalId')}</label>
                <div className={styles.inputWrapper}>
                  <CreditCard size={16} style={{ position: 'absolute', marginInlineStart: '12px', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    required
                    maxLength={14}
                    pattern="\d{14}"
                    className={styles.authInput}
                    style={{ paddingInlineStart: '36px' }}
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Password (Login, Register modes) */}
            {(mode === 'login' || mode === 'register') && (
              <div className={styles.formGroup}>
                <label>{t('password')}</label>
                <div className={styles.inputWrapper}>
                  <Lock size={16} style={{ position: 'absolute', marginInlineStart: '12px', color: 'var(--text-secondary)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className={styles.authInput}
                    style={{ paddingInlineStart: '36px', paddingInlineEnd: '40px' }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {/* Eye Toggle Icon for Visibility */}
                  <span className={styles.eyeIcon} onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </span>
                </div>
              </div>
            )}

            {/* OTP Code (OTP, Reset modes) */}
            {(mode === 'otp' || mode === 'reset') && (
              <div className={styles.formGroup}>
                <label>{language === 'ar' ? 'رمز التحقق OTP' : 'OTP Code'}</label>
                <input
                  type="text"
                  required
                  placeholder="123456"
                  maxLength={6}
                  className={styles.authInput}
                  style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.2rem', fontWeight: 'bold' }}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                />
              </div>
            )}

            {/* New Password (Reset mode only) */}
            {mode === 'reset' && (
              <div className={styles.formGroup}>
                <label>{language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}</label>
                <div className={styles.inputWrapper}>
                  <Lock size={16} style={{ position: 'absolute', marginInlineStart: '12px', color: 'var(--text-secondary)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className={styles.authInput}
                    style={{ paddingInlineStart: '36px', paddingInlineEnd: '40px' }}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <span className={styles.eyeIcon} onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </span>
                </div>
              </div>
            )}

            {/* Forgot password button (Login mode only) */}
            {mode === 'login' && (
              <div className={styles.actionRow}>
                <span></span>
                <span className={styles.forgotLink} onClick={() => setMode('forgot')}>
                  {t('forgot_password')}
                </span>
              </div>
            )}

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? (language === 'ar' ? 'جاري التحميل...' : 'Loading...') : t('submit')}
            </button>
          </form>

          {/* Toggle modes link */}
          <div className={styles.toggleLink}>
            {mode === 'login' && (
              <>
                {t('dont_have_account')}{' '}
                <span onClick={() => { setMode('register'); setErrorMsg(null); }}>
                  {language === 'ar' ? 'سجل هنا' : 'Register here'}
                </span>
              </>
            )}
            {mode === 'register' && (
              <>
                {t('already_have_account')}{' '}
                <span onClick={() => { setMode('login'); setErrorMsg(null); }}>
                  {language === 'ar' ? 'سجل دخولك' : 'Login'}
                </span>
              </>
            )}
            {mode === 'otp' && (
              <span onClick={() => { setMode('register'); setErrorMsg(null); }}>
                {language === 'ar' ? 'الرجوع للتسجيل' : 'Back to register'}
              </span>
            )}
            {mode === 'forgot' && (
              <span onClick={() => { setMode('login'); setErrorMsg(null); }}>
                {language === 'ar' ? 'الرجوع لتسجيل الدخول' : 'Back to login'}
              </span>
            )}
            {mode === 'reset' && (
              <span onClick={() => { setMode('forgot'); setErrorMsg(null); }}>
                {language === 'ar' ? 'إعادة إرسال الكود' : 'Resend code'}
              </span>
            )}
          </div>
        </div>

        {/* Demo Preset Dashboard Buttons */}
        <div style={{
          width: '100%',
          maxWidth: '450px',
          backgroundColor: 'rgba(28, 29, 38, 0.6)',
          border: '1px dashed var(--border-color)',
          borderRadius: '8px',
          padding: '1.5rem',
        }}>
          <h4 style={{ color: 'var(--accent-gold)', marginBottom: '10px', fontSize: '0.9rem', textAlign: 'center' }}>
            ⚙️ {language === 'ar' ? 'لوحة حسابات التفتيش والخدمة (للتجربة السريعة)' : 'Demo Presets Quick Test Panel'}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {demoAccounts.map(acc => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleDemoLogin(acc.email)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  transition: 'border-color var(--transition-fast)'
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-gold)'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                <span>{language === 'ar' ? acc.nameAr : acc.nameEn}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{acc.email}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
