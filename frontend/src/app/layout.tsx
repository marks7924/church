import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ChurchAiAssistant from "../components/ChurchAiAssistant";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

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
