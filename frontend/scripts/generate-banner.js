const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function createOgBanner() {
  const width = 1200;
  const height = 630;

  const publicDir = path.join(__dirname, '..', 'public');
  const logoPath = path.join(publicDir, 'logo.png');
  const bannerPath = path.join(publicDir, 'og-banner.png');

  // Resize logo for banner
  const logoBuffer = await sharp(logoPath)
    .resize(320, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const svgOverlay = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#08090C" />
        <stop offset="50%" stop-color="#11131C" />
        <stop offset="100%" stop-color="#08090C" />
      </linearGradient>
      <radialGradient id="goldGlow" cx="50%" cy="40%" r="55%">
        <stop offset="0%" stop-color="#E2B714" stop-opacity="0.18" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="goldLine" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#E2B714" stop-opacity="0" />
        <stop offset="50%" stop-color="#E2B714" stop-opacity="1" />
        <stop offset="100%" stop-color="#E2B714" stop-opacity="0" />
      </linearGradient>
    </defs>

    <!-- Background -->
    <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
    <circle cx="600" cy="280" r="460" fill="url(#goldGlow)" />

    <!-- Borders -->
    <rect x="28" y="28" width="1144" height="574" rx="16" fill="none" stroke="#E2B714" stroke-width="2" stroke-opacity="0.45" />
    <rect x="38" y="38" width="1124" height="554" rx="12" fill="none" stroke="#E2B714" stroke-width="1" stroke-opacity="0.2" />

    <!-- Corner Cross Accents -->
    <text x="60" y="74" font-size="24" fill="#E2B714" opacity="0.8">✟</text>
    <text x="1120" y="74" font-size="24" fill="#E2B714" opacity="0.8" text-anchor="end">✟</text>
    <text x="60" y="575" font-size="24" fill="#E2B714" opacity="0.8">✟</text>
    <text x="1120" y="575" font-size="24" fill="#E2B714" opacity="0.8" text-anchor="end">✟</text>

    <!-- Typography -->
    <!-- Arabic Church Name -->
    <text x="600" y="285" font-family="'Cairo', system-ui, sans-serif" font-size="40" font-weight="700" fill="#FFFFFF" text-anchor="middle">كنيسة الشهيد العظيم أبي سيفين</text>
    
    <!-- English Church Name -->
    <text x="600" y="335" font-family="'Outfit', system-ui, sans-serif" font-size="24" font-weight="600" fill="#E2B714" text-anchor="middle">St. Philopater Coptic Orthodox Church</text>

    <!-- Gold Divider -->
    <rect x="340" y="365" width="520" height="2" fill="url(#goldLine)" />
    <polygon points="600,361 606,366 600,371 594,366" fill="#E2B714" />

    <!-- Subtitle / Tagline -->
    <text x="600" y="415" font-family="'Cairo', system-ui, sans-serif" font-size="22" font-weight="500" fill="#E5E7EB" text-anchor="middle">صلوات وقداسات • خدمات كنسية • رعاية أسرية ورعوية • عظات وبث مباشر</text>
    <text x="600" y="455" font-family="'Outfit', system-ui, sans-serif" font-size="16" fill="#9CA3AF" text-anchor="middle">Liturgy Schedules • Spiritual Services • Family Pastoral Care • Online Broadcast</text>

    <!-- Official Badge Bottom -->
    <rect x="440" y="505" width="320" height="40" rx="20" fill="rgba(226, 183, 20, 0.12)" stroke="#E2B714" stroke-width="1.5" stroke-opacity="0.7" />
    <text x="600" y="531" font-family="'Cairo', system-ui, sans-serif" font-size="16" font-weight="600" fill="#E2B714" text-anchor="middle">الموقع الرسمي • Official Platform</text>
  </svg>
  `;

  await sharp(Buffer.from(svgOverlay))
    .composite([
      {
        input: logoBuffer,
        top: 60,
        left: Math.round((width - 320) / 2)
      }
    ])
    .png()
    .toFile(bannerPath);

  console.log('og-banner.png updated successfully with official name at:', bannerPath);
}

createOgBanner().catch(console.error);
