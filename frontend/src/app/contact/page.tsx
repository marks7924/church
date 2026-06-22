'use client';

import React, { useState } from 'react';
import { useTheme } from '../../components/ThemeContext';
import { Mail, Phone, MapPin, Send, HelpCircle } from 'lucide-react';

export default function ContactPage() {
  const { language, t } = useTheme();

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(language === 'ar' ? 'تم إرسال رسالتك بنجاح! شكراً لتواصلك معنا.' : 'Your message has been sent successfully! Thank you.');
    setName('');
    setEmail('');
    setSubject('');
    setMessage('');
    setTimeout(() => setSuccess(null), 5000);
  };

  return (
    <div className="container" style={{ padding: '3rem 1rem' }}>
      <h1 style={{ 
        textAlign: 'center', 
        fontSize: '2.2rem', 
        fontWeight: '800', 
        color: 'var(--accent-gold)',
        marginBottom: '2rem'
      }}>
        {t('nav_contact')}
      </h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2.5rem',
        marginBottom: '3rem'
      }}>
        
        {/* Contact info column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <MapPin size={24} style={{ color: 'var(--accent-gold)' }} />
            <div>
              <h4 style={{ fontWeight: 'bold' }}>{language === 'ar' ? 'العنوان' : 'Address'}</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                حدائق القبة، القاهرة، جمهورية مصر العربية
              </p>
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Phone size={24} style={{ color: 'var(--accent-gold)' }} />
            <div>
              <h4 style={{ fontWeight: 'bold' }}>{language === 'ar' ? 'رقم الهاتف والتليفون' : 'Phone Numbers'}</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                +20 2 2574 8839 <br />
                +20 100 000 0001
              </p>
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Mail size={24} style={{ color: 'var(--accent-gold)' }} />
            <div>
              <h4 style={{ fontWeight: 'bold' }}>{language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                contact@church.org <br />
                support@church.org
              </p>
            </div>
          </div>
        </div>

        {/* Contact Form Column */}
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '2rem',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>
            📬 {language === 'ar' ? 'أرسل لنا استفسارك أو تعليقك' : 'Send us your message'}
          </h3>

          {success && (
            <div style={{
              backgroundColor: 'rgba(46, 204, 113, 0.1)',
              border: '1px solid var(--accent-green)',
              color: '#2ecc71',
              padding: '10px',
              borderRadius: '4px',
              marginBottom: '1.2rem',
              fontSize: '0.85rem'
            }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الاسم الكامل' : 'Your Name'}</label>
              <input 
                type="text" 
                required 
                value={name} 
                onChange={e => setName(e.target.value)} 
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px', outline: 'none' }}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('email')}</label>
              <input 
                type="email" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الموضوع' : 'Subject'}</label>
              <input 
                type="text" 
                required 
                value={subject} 
                onChange={e => setSubject(e.target.value)} 
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الرسالة' : 'Your Message'}</label>
              <textarea 
                required 
                value={message} 
                onChange={e => setMessage(e.target.value)} 
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '4px', height: '90px', resize: 'none', outline: 'none' }}
              />
            </div>

            <button type="submit" style={{
              backgroundColor: 'var(--accent-gold)',
              color: '#000000',
              fontWeight: 'bold',
              border: 'none',
              padding: '12px',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '8px'
            }}>
              <Send size={16} />
              <span>{t('submit')}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Google Maps iframe location (using Hadayek Al Koba Cairo) */}
      <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '1.2rem', borderLeft: '4px solid var(--accent-gold)', paddingLeft: '10px' }}>
        📍 {language === 'ar' ? 'موقع الكنيسة الجغرافي' : 'Church Geographic Location'}
      </h2>
      <div style={{
        width: '100%',
        height: '350px',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d13808.825227743513!2d31.28825828859942!3d30.088265004724016!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14583fcbf7994df5%3A0xe577bf64e9a8f278!2sHadayek%20El-Kobba%2C%20El-Qobba%2C%20Cairo%20Governorate!5e0!3m2!1sen!2seg!4v1700000000000"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen={true}
          loading="lazy"
        ></iframe>
      </div>
    </div>
  );
}
