'use client';

import React from 'react';
import { useTheme } from './ThemeContext';

export default function Footer() {
  const { language, t } = useTheme();

  return (
    <footer style={{
      backgroundColor: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border-color)',
      padding: '3rem 2rem 2rem 2rem',
      marginTop: 'auto',
      transition: 'background-color var(--transition-normal)'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '2rem',
        marginBottom: '2rem'
      }}>
        {/* About column */}
        <div>
          <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>†</span> {t('nav_title')}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
            {t('hero_title')}
          </p>
        </div>

        {/* Links column */}
        <div>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>{t('quick_nav')}</h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
            <li><a href="/schedule" style={{ color: 'var(--text-secondary)' }}>{t('nav_schedule')}</a></li>
            <li><a href="/sermons" style={{ color: 'var(--text-secondary)' }}>{t('nav_sermons')}</a></li>
            <li><a href="/ministries" style={{ color: 'var(--text-secondary)' }}>{t('nav_ministries')}</a></li>
            <li><a href="/donations" style={{ color: 'var(--text-secondary)' }}>{t('nav_donations')}</a></li>
          </ul>
        </div>

        {/* Contact info column */}
        <div>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>{t('nav_contact')}</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.8' }}>
            📍 حدائق القبة، القاهرة، مصر / Hadayek Al Koba, Cairo, Egypt<br />
            📞 +20 2 2574 8839<br />
            ✉️ contact@church.org
          </p>
        </div>

        {/* Social Media Column */}
        <div>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
            {language === 'ar' ? 'وسائل التواصل الاجتماعي' : 'Social Media'}
          </h4>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '10px' }}>
            {/* Facebook */}
            <a href="https://www.facebook.com/stPhilopateer" target="_blank" rel="noopener noreferrer" className="social-icon" title="Facebook">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/></svg>
            </a>
            {/* Instagram */}
            <a href="https://www.instagram.com/philopateerchurch/" target="_blank" rel="noopener noreferrer" className="social-icon" title="Instagram">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
            {/* YouTube */}
            <a href="https://www.youtube.com/@PhilopateerChurch" target="_blank" rel="noopener noreferrer" className="social-icon" title="YouTube">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.107C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.388.511a3.002 3.002 0 0 0-2.11 2.107C0 8.053 0 12 0 12s0 3.947.502 5.837a3.003 3.003 0 0 0 2.11 2.107C4.495 20.455 12 20.455 12 20.455s7.505 0 9.388-.511a3.002 3.002 0 0 0 2.11-2.107C24 15.947 24 12 24 12s0-3.947-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
            {/* TikTok */}
            <a href="https://www.tiktok.com/@philopateerchurch" target="_blank" rel="noopener noreferrer" className="social-icon" title="TikTok">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.99-1.72-.08-.07-.17-.17-.25-.26V14c0 1.71-.35 3.48-1.41 4.79-1.32 1.67-3.64 2.58-5.74 2.37-2.58-.26-4.93-2.22-5.38-4.83-.58-3.32 1.37-6.81 4.72-7.51.9-.19 1.84-.16 2.71.1v4.06c-.84-.33-1.83-.34-2.61.19-.88.6-1.3 1.72-1.07 2.78.23 1.1 1.37 1.9 2.5 1.78 1.22-.13 2.19-1.28 2.19-2.51V0c-.84.01-1.68.01-2.52.02z"/></svg>
            </a>
            {/* WhatsApp */}
            <a href="https://whatsapp.com/channel/0029Vb5sGUb5EjxyaEmy3x15" target="_blank" rel="noopener noreferrer" className="social-icon" title="WhatsApp">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.455h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
            {/* SoundCloud */}
            <a href="https://soundcloud.com/philopateer-church-1955" target="_blank" rel="noopener noreferrer" className="social-icon" title="SoundCloud">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 11.53c0-.12.01-.23.01-.35v-.19c.02-1.5 1.24-2.7 2.74-2.69.41 0 .82.1 1.18.29.35-.91 1.22-1.52 2.2-1.52.92 0 1.74.54 2.11 1.37.38-.28.85-.43 1.33-.42 1.25.07 2.22 1.14 2.16 2.39-.01.12-.02.24-.04.36l.24.08c1.19.46 1.83 1.77 1.43 2.96-.3.9-1.14 1.49-2.09 1.49H12v-4.22zm-1.02.66v2.96H9.86v-2.96h1.12zm-2.25.68v2.28H7.61v-2.28h1.12zm-2.25.26v2.02H5.36v-2.02h1.12zm-2.25.32v1.7H3.11v-1.7h1.12zm-2.25.29v1.41H.86v-1.41h1.12zm9-3.95v6.08h-1.12v-6.08h1.12z"/></svg>
            </a>
          </div>
        </div>
      </div>

      {/* Coptic Cross and Copyright banner */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        borderTop: '1px solid var(--border-color)',
        paddingTop: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        fontSize: '0.85rem',
        color: 'var(--text-secondary)'
      }}>
        <span>© {new Date().getFullYear()} {t('nav_title')}. All Rights Reserved.</span>
        <span style={{ 
          fontSize: '0.9rem', 
          fontWeight: '500', 
          color: 'var(--text-secondary)' 
        }}>
          Developed by{' '}
          <a 
            href="https://linktr.ee/Mark7924" 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ 
              color: 'var(--accent-gold)', 
              fontWeight: 'bold', 
              textDecoration: 'underline'
            }}
          >
            Mark Samer
          </a>
        </span>
        <span style={{ fontSize: '1.2rem', color: 'var(--accent-gold)' }}>☥</span>
      </div>
    </footer>
  );
}
