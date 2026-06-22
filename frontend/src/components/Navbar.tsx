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
          <img src="/logo.png" alt="Church Logo" className={styles.logoImage} />
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
          
          {/* Mobile-only Live dot indicator */}
          {isLiveActive && (
            <Link href="/" className={`${styles.mobileLiveBadge} pulse-live`}>
              <span className={styles.mobileLiveDot}></span>
              <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{t('live_now')}</span>
            </Link>
          )}

          {/* Desktop-only Controls */}
          <div className={styles.desktopControls}>
            {/* Live Indicator (only visible when active on desktop) */}
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

            {/* Theme Toggle */}
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
          </div>

          {/* Hamburger Icon */}
          <button className={styles.mobileMenuBtn} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown / Slide Drawer */}
      {isMobileMenuOpen && (
        <div className={styles.mobileDropdownOverlay} onClick={() => setIsMobileMenuOpen(false)}>
          <div className={styles.mobileDropdownDrawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <span className={styles.drawerTitle}>{t('nav_title')}</span>
              <button className={styles.closeDrawerBtn} onClick={() => setIsMobileMenuOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <ul className={styles.mobileLinksList}>
              {navItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <li key={item.path} onClick={() => setIsMobileMenuOpen(false)}>
                    <Link href={item.path} className={`${styles.mobileNavLink} ${isActive ? styles.mobileActiveLink : ''}`}>
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className={styles.drawerDivider}></div>

            {/* Controls in Mobile Drawer */}
            <div className={styles.drawerControls}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className={styles.drawerControlBtn} onClick={toggleLanguage}>
                  <Languages size={16} />
                  <span>{language === 'ar' ? 'English' : 'عربي'}</span>
                </button>
                <button className={styles.drawerControlBtn} onClick={toggleTheme}>
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                  <span>{theme === 'dark' ? (language === 'ar' ? 'وضع مضيء' : 'Light') : (language === 'ar' ? 'وضع مظلم' : 'Dark')}</span>
                </button>
              </div>

              {/* Font Scaler */}
              <div className={styles.drawerFontScaler}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>{t('font_scale')}</span>
                  <span>{fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="24"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-gold)', marginTop: '8px' }}
                />
              </div>

              {/* Auth / Dashboard buttons in Mobile Drawer */}
              <div style={{ marginTop: '10px' }}>
                {user ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <Link href="/dashboard" className={styles.drawerAuthBtn} onClick={() => setIsMobileMenuOpen(false)}>
                      <LayoutDashboard size={18} />
                      <span>{t('nav_dashboard')} ({user.fullName.split(' ')[0]})</span>
                    </Link>
                    <button className={styles.drawerLogoutBtn} onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}>
                      <LogOut size={18} />
                      <span>{t('logout')}</span>
                    </button>
                  </div>
                ) : (
                  <Link href="/login" className={styles.drawerAuthBtn} onClick={() => setIsMobileMenuOpen(false)}>
                    <span>{t('login')}</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
