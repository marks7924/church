'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from './ThemeContext';
import styles from './Navbar.module.css';
import { Menu, X, Sun, Moon, Languages, Type, LogOut, LayoutDashboard, UserCheck } from 'lucide-react';
import { API_URL } from '../config';

export default function Navbar() {
  const { theme, language, fontSize, toggleTheme, toggleLanguage, setFontSize, t } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const pathname = usePathname();
  const router = useRouter();

  // Load user details from localStorage
  const loadUser = () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('church-token');
      const userData = localStorage.getItem('church-user');
      if (token && userData) {
        try {
          setUser(JSON.parse(userData));
        } catch (e) {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    }
  };

  useEffect(() => {
    loadUser();
    
    // Listen for custom login events to refresh navbar state
    const handleAuthChange = () => loadUser();
    window.addEventListener('auth-change', handleAuthChange);
    
    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, []);

  // Poll API for Live Stream status
  useEffect(() => {
    const checkLiveStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/live`);
        if (res.ok) {
          const data = await res.json();
          setIsLiveActive(data.isActive);
        }
      } catch (err) {
        // Fallback or ignore in dev
        console.log('Error fetching live status:', err);
      }
    };

    checkLiveStatus();
    const interval = setInterval(checkLiveStatus, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('church-token');
    localStorage.removeItem('church-refresh-token');
    localStorage.removeItem('church-user');
    setUser(null);
    window.dispatchEvent(new Event('auth-change'));
    router.push('/');
  };

  const navItems = [
    { name: t('nav_home'), path: '/' },
    { name: t('nav_schedule'), path: '/schedule' },
    { name: t('nav_sermons'), path: '/sermons' },
    { name: t('nav_ministries'), path: '/ministries' },
    { name: t('nav_donations'), path: '/donations' },
    { name: t('nav_about'), path: '/about' },
    { name: t('nav_contact'), path: '/contact' },
  ];

  return (
    <nav className={`${styles.header} glass-nav`}>
      <div className={styles.navContainer}>
        {/* Logo */}
        <div className={styles.logoArea} onClick={() => router.push('/')}>
          <div className={styles.logoCross}>†</div>
          <span className={styles.logoText}>{t('nav_title')}</span>
        </div>

        {/* Desktop Navigation Links */}
        <ul className={styles.linksList}>
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <li key={item.path}>
                <Link href={item.path} className={`${styles.navLink} ${isActive ? styles.activeLink : ''}`}>
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Control elements */}
        <div className={styles.controlsArea}>
          {/* Live Indicator (only visible when active) */}
          {isLiveActive && (
            <Link href="/" className={`${styles.liveBadge} pulse-live`}>
              <span className={styles.liveDot}></span>
              <span>{t('live_now')}</span>
            </Link>
          )}

          {/* Translation Toggle */}
          <button className={styles.controlBtn} onClick={toggleLanguage} title="Change Language">
            <Languages size={16} />
            <span>{language === 'ar' ? 'English' : 'عربي'}</span>
          </button>

          {/* Theme Toggle (renders Eye for password but standard theme icons here) */}
          <button className={styles.controlBtn} onClick={toggleTheme} title="Toggle Theme">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Font Scaling */}
          <div className={styles.fontScalerContainer}>
            <Type size={16} className={styles.sliderLabel} />
            <input
              type="range"
              min="12"
              max="24"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className={styles.sliderInput}
              title={t('font_scale')}
            />
            <span style={{ fontSize: '0.75rem', width: '15px', textAlign: 'center' }}>
              {fontSize}
            </span>
          </div>

          {/* Profile / Dashboard or Login */}
          {user ? (
            <>
              <Link href="/dashboard" className={styles.controlBtn}>
                <LayoutDashboard size={16} />
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {user.fullName.split(' ')[0]} 
                  {user.familyProfileStatus === 'APPROVED' && <UserCheck size={12} style={{ color: 'var(--accent-gold)' }} />}
                </span>
              </Link>
              <button className={styles.controlBtn} onClick={handleLogout} title={t('logout')}>
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <Link href="/login" className={styles.controlBtn}>
              {t('login')}
            </Link>
          )}

          {/* Hamburger Icon */}
          <button className={styles.mobileMenuBtn} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <ul className={styles.mobileDropdown}>
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <li key={item.path} onClick={() => setIsMobileMenuOpen(false)}>
                <Link href={item.path} className={`${styles.navLink} ${isActive ? styles.activeLink : ''}`}>
                  {item.name}
                </Link>
              </li>
            );
          })}
          {/* Mobile direct settings buttons */}
          <li style={{ display: 'flex', gap: '10px', paddingTop: '10px' }}>
            <button className={styles.controlBtn} onClick={toggleLanguage} style={{ flex: 1 }}>
              <Languages size={14} />
              <span>{language === 'ar' ? 'English' : 'عربي'}</span>
            </button>
            <button className={styles.controlBtn} onClick={toggleTheme} style={{ flex: 1 }}>
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('font_scale')}:</span>
            <input
              type="range"
              min="12"
              max="24"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--accent-gold)' }}
            />
          </li>
        </ul>
      )}
    </nav>
  );
}
