'use client';

import React from 'react';
import { useTheme } from './ThemeContext';

export default function Footer() {
  const { t } = useTheme();

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
        <span style={{ fontSize: '1.2rem', color: 'var(--accent-gold)' }}>☥</span>
      </div>
    </footer>
  );
}
