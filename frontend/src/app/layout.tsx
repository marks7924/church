import type { Metadata } from "next";
import { Cairo, Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-cairo",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "كنيستنا القبطية الأرثوذكسية | Coptic Church Platform",
  description: "الموقع الرسمي لصلوات الكنيسة، حجز الاعترافات، وتسجيل العضوية الكنسية للأسرة",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar">
      <body className={`${cairo.variable} ${outfit.variable}`} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <ThemeProvider>
          <Navbar />
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
