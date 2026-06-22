'use client';

import React from 'react';
import { useTheme } from '../../components/ThemeContext';
import { ShieldAlert, CreditCard, Landmark, Check } from 'lucide-react';

export default function DonationsPage() {
  const { language, t } = useTheme();
  const [copiedAccount, setCopiedAccount] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(label);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const bankAccounts = [
    { currency: 'EGP', number: '1300001000001665', nameAr: 'حساب الجنيه المصري', nameEn: 'Egyptian Pound Account' },
    { currency: 'USD', number: '1300120000015295', nameAr: 'حساب الدولار الأمريكي', nameEn: 'US Dollar Account' },
    { currency: 'GBP', number: '1300125000000351', nameAr: 'حساب الجنيه الإسترليني', nameEn: 'British Pound Account' },
    { currency: 'EUR', number: '1300130000000931', nameAr: 'حساب اليورو الأوروبي', nameEn: 'Euro Account' },
  ];

  return (
    <div className="container" style={{ padding: '3rem 1rem', maxWidth: '800px' }}>
      <h1 style={{ 
        textAlign: 'center', 
        fontSize: '2.2rem', 
        fontWeight: '800', 
        color: 'var(--accent-gold)',
        marginBottom: '1rem'
      }}>
        {t('nav_donations')}
      </h1>

      {/* Security disclaimer box */}
      <div style={{
        backgroundColor: 'rgba(229, 9, 20, 0.05)',
        border: '1px solid var(--accent-red)',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '2.5rem',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start'
      }}>
        <ShieldAlert size={24} style={{ color: 'var(--accent-red)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '6px', fontWeight: 'bold' }}>
            ⚠️ {language === 'ar' ? 'تنبيه أمني هام' : 'Important Security Notice'}
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5' }}>
            {t('donation_desc')}
          </p>
        </div>
      </div>

      {/* Bank details summary card */}
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '2rem',
        boxShadow: 'var(--shadow-lg)',
        marginBottom: '2rem'
      }}>
        <h3 style={{ 
          fontSize: '1.3rem', 
          marginBottom: '1.5rem', 
          borderBottom: '1px solid var(--border-color)', 
          paddingBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Landmark size={20} style={{ color: 'var(--accent-gold)' }} />
          <span>{language === 'ar' ? 'تفاصيل الحساب البنكي الرئيسي' : 'Main Bank Account Details'}</span>
        </h3>

        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px', 
          fontSize: '1rem',
          lineHeight: '1.6',
          marginBottom: '2rem',
          color: 'var(--text-primary)'
        }}>
          <div>🏛️ <b>{t('bank_name')}</b></div>
          <div>📍 <b>{t('bank_branch')}</b></div>
          <div>🔑 <b>{t('bank_swift')}</b></div>
        </div>

        {/* Currency grids */}
        <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: '600' }}>
          {language === 'ar' ? 'أرقام الحسابات حسب العملة (اضغط للنسخ):' : 'Account numbers by currency (click to copy):'}
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {bankAccounts.map(acc => (
            <div 
              key={acc.currency}
              onClick={() => copyToClipboard(acc.number, acc.currency)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-gold)'}
              onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {language === 'ar' ? acc.nameAr : acc.nameEn}
                </span>
                <span style={{ fontSize: '1.1rem', fontWeight: '700', letterSpacing: '0.5px', color: 'var(--text-primary)' }}>
                  {acc.number}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  backgroundColor: 'rgba(226, 183, 20, 0.1)',
                  color: 'var(--accent-gold)',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}>
                  {acc.currency}
                </span>
                {copiedAccount === acc.currency ? (
                  <Check size={18} style={{ color: 'var(--accent-green)' }} />
                ) : (
                  <CreditCard size={18} style={{ color: 'var(--text-secondary)' }} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
