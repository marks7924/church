'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';
type Language = 'ar' | 'en';

interface TranslationDictionary {
  [key: string]: {
    ar: string;
    en: string;
  };
}

export const dictionary: TranslationDictionary = {
  // Navigation
  nav_title: { ar: 'كنيستنا القبطية', en: 'Our Coptic Church' },
  nav_home: { ar: 'الرئيسية', en: 'Home' },
  nav_schedule: { ar: 'مواعيد القداسات', en: 'Mass Schedule' },
  nav_live: { ar: 'البث المباشر', en: 'Live Stream' },
  nav_membership: { ar: 'العضوية الكنسية', en: 'Membership' },
  nav_sermons: { ar: 'العظات', en: 'Sermons' },
  nav_ministries: { ar: 'الخدمات الكنسية', en: 'Ministries' },
  nav_donations: { ar: 'التبرعات والمساندة', en: 'Donations' },
  nav_about: { ar: 'عن الكنيسة', en: 'About' },
  nav_contact: { ar: 'اتصل بنا', en: 'Contact' },
  nav_dashboard: { ar: 'لوحة التحكم', en: 'Dashboard' },
  
  // Hero
  hero_title: { ar: 'كنيسه الشهيد العظيم ابو سيفين بحدائق القبه', en: 'One Holy Apostolic Coptic Orthodox Church' },
  hero_subtitle: { ar: 'مرحبًا بكم في البيت الروحي لصلواتنا وخدمتنا وتجمعنا المبارك', en: 'Welcome to the spiritual home of our prayers, services, and blessed assembly' },
  quick_nav: { ar: 'روابط سريعة', en: 'Quick Navigation' },
  book_confession: { ar: 'حجز اعتراف', en: 'Book Confession' },
  meet_bishop: { ar: 'مقابلة سيدنا', en: 'Meet Bishop' },
  trips: { ar: 'الرحلات الكنسية', en: 'Church Trips' },
  photos: { ar: 'الصور التاريخية', en: 'Historic Photos' },
  live_now: { ar: 'بث مباشر الآن', en: 'LIVE NOW' },
  
  // Auth
  login: { ar: 'تسجيل الدخول', en: 'Login' },
  logout: { ar: 'تسجيل الخروج', en: 'Logout' },
  register: { ar: 'إنشاء حساب جديد', en: 'Create New Account' },
  email: { ar: 'البريد الإلكتروني', en: 'Email' },
  password: { ar: 'كلمة المرور', en: 'Password' },
  fullName: { ar: 'الاسم الكامل ثلاثي', en: 'Full Name' },
  phone: { ar: 'رقم الهاتف', en: 'Phone Number' },
  nationalId: { ar: 'الرقم القومي (14 رقم)', en: 'National ID (14 digits)' },
  dont_have_account: { ar: 'ليس لديك حساب؟ سجل الآن', en: 'Don\'t have an account? Register now' },
  already_have_account: { ar: 'لديك حساب بالفعل؟ سجل دخولك', en: 'Already have an account? Login' },
  verify_email: { ar: 'تأكيد البريد الإلكتروني', en: 'Verify Email' },
  enter_otp: { ar: 'أدخل رمز الـ OTP المرسل لبريدك الالكتروني', en: 'Enter the OTP code sent to your email' },
  submit: { ar: 'إرسال', en: 'Submit' },
  forgot_password: { ar: 'نسيت كلمة المرور؟', en: 'Forgot Password?' },
  reset_password: { ar: 'إعادة تعيين كلمة المرور', en: 'Reset Password' },
  
  // Bookings
  booking_title: { ar: 'حجز موعد اعتراف وإرشاد روحي', en: 'Book Confession & Spiritual Guidance' },
  select_priest: { ar: 'اختر الأب الكاهن', en: 'Select Father / Bishop' },
  select_date: { ar: 'اختر التاريخ', en: 'Select Date' },
  select_slot: { ar: 'اختر الوقت المتاح', en: 'Select Available Slot' },
  booking_notes: { ar: 'ملاحظات إضافية (اختياري)', en: 'Additional Notes (Optional)' },
  confirm_booking: { ar: 'تأكيد الحجز', en: 'Confirm Booking' },
  no_slots: { ar: 'لا توجد مواعيد متاحة في هذا اليوم.', en: 'No available slots on this day.' },
  suggest_slots: { ar: 'مواعيد بديلة مقترحة:', en: 'Suggested alternative slots:' },
  double_booking_error: { ar: 'لديك حجز مسبق بالفعل في هذا اليوم.', en: 'You already have a booking on this day.' },
  
  // Membership Form
  membership_title: { ar: 'تسجيل استمارة العضوية الكنسية للأسرة', en: 'Register Church Family Membership' },
  family_head: { ar: 'بيانات رب الأسرة', en: 'Family Head Details' },
  street: { ar: 'اسم الشارع', en: 'Street Name' },
  building: { ar: 'رقم المبنى', en: 'Building Number' },
  floor: { ar: 'الطابق', en: 'Floor' },
  apartment: { ar: 'رقم الشقة', en: 'Apartment' },
  job: { ar: 'الوظيفة/العمل', en: 'Job/Occupation' },
  social_status: { ar: 'الحالة الاجتماعية', en: 'Social Status' },
  status_single: { ar: 'أعزب', en: 'Single' },
  status_married: { ar: 'متزوج', en: 'Married' },
  status_divorced: { ar: 'مطلق', en: 'Divorced' },
  status_widowed: { ar: 'أرمل', en: 'Widowed' },
  
  wife_details: { ar: 'بيانات الزوجة', en: 'Wife Details' },
  confession_father: { ar: 'أب الاعتراف للزوجة (اختياري)', en: 'Confession Father (Optional)' },
  
  children_list: { ar: 'بيانات الأبناء', en: 'Children Details' },
  add_child: { ar: 'إضافة ابن/ابنة +', en: 'Add Child +' },
  child_name: { ar: 'اسم الابن ثنائي', en: 'Child Name' },
  child_edu_job: { ar: 'المرحلة الدراسية / الوظيفة', en: 'Education Level / Job' },
  
  relatives_list: { ar: 'الأقارب المقيمين بالمنزل', en: 'Relatives living in same home' },
  add_relative: { ar: 'إضافة قريب +', en: 'Add Relative +' },
  relationship_type: { ar: 'صلة القرابة', en: 'Relationship Type' },
  
  servants_list: { ar: 'خدام الكنيسة المفتقدين للأسرة', en: 'Church servants visiting the family' },
  add_servant: { ar: 'إضافة اسم خادم +', en: 'Add Servant +' },
  servant_name: { ar: 'اسم الخادم فقط', en: 'Servant Name' },
  
  family_notes: { ar: 'ملاحظات هامة للأسرة', en: 'Important notes for the family' },
  submit_membership: { ar: 'إرسال الاستمارة للمراجعة الكنسية', en: 'Submit Application for Church Review' },
  
  // Donations
  donation_title: { ar: 'حسابات التبرعات والمساهمة الكنسية', en: 'Church Donations & Support Accounts' },
  donation_desc: { ar: 'الكنيسة لا تقوم بجمع التبرعات أونلاين ولا تستخدم بوابات دفع إلكترونية. هذه الصفحة تعرض فقط الحسابات البنكية الرسمية المسجلة لدى البنوك المصرية للمساهمة في بناء الكنائس وأعمال الرعاية والخدمات والرحمة.', en: 'The church does NOT process online checkouts or payment gateways. This display-only page contains the official verified bank accounts for contributing to building services, social programs, and community care.' },
  bank_name: { ar: 'البنك: بنك مصر', en: 'Bank: Banque Misr' },
  bank_branch: { ar: 'الفرع: حدائق القبة', en: 'Branch: Hadayek Al Koba' },
  bank_swift: { ar: 'سويفت كود: BMISEGCX140', en: 'SWIFT Code: BMISEGCX140' },
  acc_egp: { ar: 'حساب الجنيه المصري (EGP)', en: 'Egyptian Pound Account (EGP)' },
  acc_usd: { ar: 'حساب الدولار الأمريكي (USD)', en: 'US Dollar Account (USD)' },
  acc_gbp: { ar: 'حساب الجنيه الإسترليني (GBP)', en: 'British Pound Account (GBP)' },
  acc_eur: { ar: 'حساب اليورو الأوروبي (EUR)', en: 'Euro Account (EUR)' },
  
  // Dashboard
  welcome: { ar: 'أهلاً بك يا', en: 'Welcome,' },
  member_status: { ar: 'حالة العضوية الكنسية:', en: 'Church Membership Status:' },
  status_pending: { ar: 'قيد المراجعة والتدقيق', en: 'Pending Review' },
  status_approved: { ar: 'عضوية معتمدة ونشطة', en: 'Approved & Active' },
  status_rejected: { ar: 'مرفوضة / بحاجة لإعادة ملء الاستمارة', en: 'Rejected / Resubmission Required' },
  manage_members: { ar: 'إدارة طلبات العضوية الكنسية', en: 'Manage Membership Applications' },
  manage_schedules: { ar: 'تعديل القداسات والجدول', en: 'Edit Mass Schedules' },
  manage_sermons: { ar: 'رفع وإدارة العظات والتعليم', en: 'Upload & Manage Sermons' },
  manage_events: { ar: 'إدارة مؤتمرات ورحلات الكنيسة', en: 'Manage Conferences & Trips' },
  manage_live: { ar: 'إدارة البث المباشر لليوتيوب', en: 'Manage YouTube Live Stream' },
  approve: { ar: 'موافقة', en: 'Approve' },
  reject: { ar: 'رفض وتوجيه ملحوظة', en: 'Reject & Add Notes' },
  feedback_placeholder: { ar: 'توجيهات أو سبب الرفض/المراجعة للأسرة...', en: 'Reason for rejection or updates needed...' },
  booking_requests: { ar: 'طلبات الحجز وجلسات الإرشاد', en: 'Booking & Guidance Sessions' },
  no_bookings: { ar: 'لا توجد جلسات حجز مسجلة.', en: 'No registered booking sessions.' },
  
  // General Buttons
  back: { ar: 'رجوع', en: 'Back' },
  save: { ar: 'حفظ والتعديل', en: 'Save Changes' },
  font_scale: { ar: 'حجم الخط', en: 'Font Size' }
};

interface ThemeContextType {
  theme: Theme;
  language: Language;
  fontSize: number;
  toggleTheme: () => void;
  toggleLanguage: () => void;
  setFontSize: (size: number) => void;
  t: (key: string) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [language, setLanguage] = useState<Language>('ar');
  const [fontSize, setFontSizeState] = useState<number>(16);

  // Load configuration from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('church-theme') as Theme;
    const savedLang = localStorage.getItem('church-lang') as Language;
    const savedFontSize = localStorage.getItem('church-fontsize');

    if (savedTheme) setTheme(savedTheme);
    if (savedLang) setLanguage(savedLang);
    if (savedFontSize) setFontSizeState(parseInt(savedFontSize));
  }, []);

  // Sync settings with DOM attributes on change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('church-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    localStorage.setItem('church-lang', language);
  }, [language]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
    localStorage.setItem('church-fontsize', fontSize.toString());
  }, [fontSize]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'ar' ? 'en' : 'ar'));
  };

  const setFontSize = (size: number) => {
    // Restrict size between 12px and 24px
    const bounded = Math.max(12, Math.min(24, size));
    setFontSizeState(bounded);
  };

  const t = (key: string): string => {
    const term = dictionary[key];
    if (!term) return key;
    return language === 'ar' ? term.ar : term.en;
  };

  return (
    <ThemeContext.Provider value={{ theme, language, fontSize, toggleTheme, toggleLanguage, setFontSize, t }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
