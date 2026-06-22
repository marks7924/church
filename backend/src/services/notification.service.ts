import * as nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'no-reply@church.org';

// Create a transporter if credentials exist, otherwise log fallback
let transporter: nodemailer.Transporter | null = null;
if (SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

export async function sendEmail(to: string, subject: string, html: string) {
  console.log(`\n📧 [EMAIL SERVICE] Sending Email:\n   To: ${to}\n   Subject: ${subject}\n   Content (HTML preview): ${html.substring(0, 150)}...\n`);
  
  if (transporter) {
    try {
      await transporter.sendMail({
        from: SMTP_FROM,
        to,
        subject,
        html,
      });
      console.log(`   ✅ Email sent successfully via SMTP (${SMTP_HOST})`);
    } catch (error) {
      console.error(`   ❌ Failed to send email via SMTP:`, error);
    }
  } else {
    console.log(`   ℹ️ SMTP credentials missing, email was logged to stdout.`);
  }
}

export async function sendPushNotification(title: string, body: string, topic: string = 'general') {
  console.log(`\n🔔 [FIREBASE PUSH] Sending Notification:\n   Topic: ${topic}\n   Title: ${title}\n   Body: ${body}\n`);
  // Here we would integrate firebase-admin SDK messaging().sendToDevice() or send()
}

export async function sendSMS(phone: string, message: string) {
  console.log(`\n📱 [SMS SERVICE] Sending SMS:\n   Phone: ${phone}\n   Message: ${message}\n`);
}
