import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ChurchAiAssistant from "../components/ChurchAiAssistant";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://coptic-church.org');

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#E2B714",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "كنيسة السيدة العذراء والشهيد أبي سيفين | Coptic Orthodox Church",
    template: "%s | كنيسة السيدة العذراء والشهيد أبي سيفين",
  },
  description: "الموقع الرسمي لكنيسة السيدة العذراء والشهيد أبي سيفين القبطية الأرثوذكسية. مواعيد القداسات الإلهية، العظات، الخدمات والأنشطة الكنسية، وحجز مواعيد الاعتراف والرعاية الروحية.",
  keywords: [
    "كنيسة قبطية أرثوذكسية",
    "مواعيد القداسات",
    "حجز موعد اعتراف",
    "كنيسة السيدة العذراء والشهيد أبي سيفين",
    "عظات قبطية",
    "خدمات كنسية",
    "Coptic Orthodox Church",
    "Liturgy Schedules",
    "Coptic Hymns",
    "Holy Mass"
  ],
  authors: [{ name: "كنيسة السيدة العذراء والشهيد أبي سيفين" }],
  creator: "كنيسة السيدة العذراء والشهيد أبي سيفين القبطية الأرثوذكسية",
  publisher: "كنيسة السيدة العذراء والشهيد أبي سيفين القبطية الأرثوذكسية",
  applicationName: "منصة الكنيسة القبطية الأرثوذكسية",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" }
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ],
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: "/",
    languages: {
      "ar": "/",
      "en": "/?lang=en",
    },
  },
  openGraph: {
    type: "website",
    locale: "ar_EG",
    alternateLocale: ["en_US"],
    url: "/",
    siteName: "كنيسة السيدة العذراء والشهيد أبي سيفين القبطية الأرثوذكسية",
    title: "كنيسة السيدة العذراء والشهيد أبي سيفين | Coptic Orthodox Church",
    description: "الموقع الرسمي لصلوات وقداسات الكنيسة، حجز الاعترافات، والخدمات الكنسية والرعوية للأسرة والشباب.",
    images: [
      {
        url: "/og-banner.png",
        width: 1200,
        height: 630,
        alt: "كنيسة السيدة العذراء والشهيد أبي سيفين القبطية الأرثوذكسية",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "كنيسة السيدة العذراء والشهيد أبي سيفين | Coptic Orthodox Church",
    description: "الموقع الرسمي لصلوات وقداسات الكنيسة، حجز الاعترافات، والخدمات الكنسية والرعوية.",
    images: ["/og-banner.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Church",
    "name": "كنيسة السيدة العذراء والشهيد أبي سيفين القبطية الأرثوذكسية",
    "alternateName": "St. Mary & St. Philopater Coptic Orthodox Church",
    "url": SITE_URL,
    "logo": `${SITE_URL}/logo.png`,
    "image": `${SITE_URL}/og-banner.png`,
    "description": "الموقع الرسمي لصلوات وقداسات الكنيسة القبطية الأرثوذكسية، حجز الاعترافات، والخدمات الكنسية والرعاية الأسرية.",
    "telephone": "+201200000000",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "EG"
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Friday", "Sunday", "Wednesday"],
        "opens": "06:30",
        "closes": "21:00"
      }
    ]
  };

  return (
    <html lang="ar">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <ThemeProvider>
          <Navbar />
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {children}
          </main>
          <Footer />
          <ChurchAiAssistant />
        </ThemeProvider>
      </body>
    </html>
  );
}
