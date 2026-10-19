import React from 'react';

export default function Loading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        width: '100%',
        padding: '2rem',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        userSelect: 'none',
      }}
      role="status"
      aria-live="polite"
      aria-label="جارٍ التحميل..."
    >
      <style>{`
        @keyframes churchPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.95;
            filter: drop-shadow(0 0 10px rgba(226, 183, 20, 0.25));
          }
          50% {
            transform: scale(1.04);
            opacity: 1;
            filter: drop-shadow(0 0 22px rgba(226, 183, 20, 0.55));
          }
        }
        @keyframes churchShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .church-loading-logo {
            animation: none !important;
          }
          .church-loading-bar {
            animation: none !important;
          }
        }
      `}</style>

      {/* Church Logo with gentle breath/pulse animation */}
      <div
        className="church-loading-logo"
        style={{
          width: '140px',
          maxWidth: '80vw',
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
          animation: 'churchPulse 2.4s ease-in-out infinite',
        }}
      >
        <img
          src="/logo.png"
          alt="كنيسة السيدة العذراء والشهيد أبي سيفين"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
        />
      </div>

      {/* Subtle Golden Shimmer Loading Line */}
      <div
        style={{
          width: '160px',
          height: '3px',
          backgroundColor: 'var(--border-color)',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '1rem',
          position: 'relative',
        }}
      >
        <div
          className="church-loading-bar"
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent 0%, var(--accent-gold) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'churchShimmer 1.8s ease-in-out infinite',
          }}
        />
      </div>

      {/* Calm Dignified Text */}
      <p
        style={{
          fontSize: '0.9rem',
          color: 'var(--text-secondary)',
          margin: 0,
          fontFamily: 'var(--font-arabic)',
          letterSpacing: '0.3px',
        }}
      >
        كنيستنا القبطية الأرثوذكسية • جاري التحميل...
      </p>
    </div>
  );
}
