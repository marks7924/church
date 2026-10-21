import * as nodemailer from 'nodemailer';

export function getSmtpConfig() {
  const host = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || 'churchsplatform@gmail.com';
  const pass = process.env.SMTP_PASS || '';
  
  // Safe from address: if SMTP_FROM is not set or uses fake domain, fallback to user
  let from = process.env.SMTP_FROM || `كنيسة الشهيد أبي سيفين <${user}>`;
  if (from.includes('your-domain.com') || from.includes('no-reply@church.org')) {
    from = `كنيسة الشهيد العظيم أبي سيفين <${user}>`;
  }

  return { host, port, user, pass, from };
}

export function createTransporter() {
  const { host, port, user, pass } = getSmtpConfig();

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    tls: {
      // Avoid SSL/TLS interception failures on local Windows/proxies/antivirus
      rejectUnauthorized: false
    }
  });
}

/**
 * Standardized Church Branded Email Template with Spam folder notice
 */
export function formatChurchEmailHtml(options: {
  titleAr: string;
  titleEn?: string;
  badge?: string;
  badgeColor?: string;
  contentHtml: string;
  callToAction?: {
    text: string;
    url: string;
  };
}): string {
  const { titleAr, titleEn, badge, badgeColor = '#d97706', contentHtml, callToAction } = options;

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titleAr}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b1120; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.3); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
              <div style="font-size: 28px; margin-bottom: 8px;">⛪</div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #fbbf24; letter-spacing: 0.5px;">كنيسة الشهيد العظيم أبي سيفين</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #cbd5e1; font-weight: 500;">بحدائق القبة — القاهرة | St. Philopateer Church</p>
              
              ${badge ? `
                <div style="margin-top: 14px; display: inline-block; padding: 4px 16px; background-color: ${badgeColor}; color: #ffffff; border-radius: 9999px; font-size: 12px; font-weight: 600;">
                  ${badge}
                </div>
              ` : ''}
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 28px 24px; direction: rtl; text-align: right; font-size: 15px; line-height: 1.8; color: #334155;">
              <h2 style="margin: 0 0 16px; font-size: 19px; color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px;">
                ${titleAr}
                ${titleEn ? `<div style="font-size: 13px; color: #64748b; font-weight: normal; margin-top: 4px;">${titleEn}</div>` : ''}
              </h2>

              <div style="margin-bottom: 24px;">
                ${contentHtml}
              </div>

              ${callToAction ? `
                <div style="text-align: center; margin: 28px 0 16px;">
                  <a href="${callToAction.url}" style="display: inline-block; background: linear-gradient(135deg, #d97706 0%, #b45309 100%); color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: bold; font-size: 15px; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.3);">
                    ${callToAction.text}
                  </a>
                </div>
              ` : ''}

              <!-- Spam / Junk Folder Warning Box -->
              <div style="background-color: #fefce8; border: 1px solid #fef08a; border-right: 4px solid #eab308; border-radius: 8px; padding: 14px 16px; margin-top: 24px; font-size: 13px; color: #854d0e; line-height: 1.6;">
                <div style="font-weight: 700; margin-bottom: 4px; display: flex; align-items: center;">
                  <span>⚠️ ملاحظة هامة جداً بشأن استلام الرسائل:</span>
                </div>
                <p style="margin: 0 0 6px;">إذا وصلت هذه الرسالة إلى مجلد <b>الرسائل غير المرغوب فيها (Spam / Junk)</b>، يرجى الضغط على <b>"ليس بريداً عشوائياً" (Not Spam)</b> أو نقل الرسالة إلى <b>صندوق الوارد (Inbox)</b> لضمان استلامك لجميع الإشعارات وبطاقات الدعوة وتأكيدات الكنيسة بشكل فوري.</p>
                <p style="margin: 0; font-size: 11.5px; color: #a16207;">Important note: If this email is in your Spam/Junk folder, please click "Not Spam" or move it to your Inbox to ensure reliable future deliveries.</p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b;">
              <p style="margin: 0 0 6px;">هذه الرسالة رسمية تم إرسالها من المنظومة الرقمية لكنيسة الشهيد أبي سيفين بحدائق القبة.</p>
              <p style="margin: 0; color: #94a3b8; font-size: 11px;">© ${new Date().getFullYear()} Saint Philopateer Mercurius Coptic Orthodox Church. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Send an email using Nodemailer with automatic Brevo or Gmail SMTP support
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { host, from } = getSmtpConfig();
  console.log(`\n📧 [EMAIL SERVICE] Dispatching email to: ${to} | Subject: "${subject}"`);

  const transporter = createTransporter();
  if (!transporter) {
    console.warn(`   ⚠️ [EMAIL SERVICE] SMTP credentials missing. Logged to console instead of sending.`);
    return { success: false, error: 'SMTP credentials missing' };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
    console.log(`   ✅ [EMAIL SERVICE] Email delivered successfully to ${to} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`   ❌ [EMAIL SERVICE] SMTP Transmission Error (${host}):`, error.message || error);
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * Diagnostic helper to verify SMTP connection status
 */
export async function verifySmtpConnection(): Promise<{ connected: boolean; error?: string; host: string; port: number }> {
  const { host, port } = getSmtpConfig();
  const transporter = createTransporter();
  
  if (!transporter) {
    return { connected: false, error: 'SMTP credentials not configured in environment variables.', host, port };
  }

  try {
    await transporter.verify();
    return { connected: true, host, port };
  } catch (error: any) {
    return { connected: false, error: error.message || String(error), host, port };
  }
}

export async function sendPushNotification(title: string, body: string, topic: string = 'general') {
  console.log(`\n🔔 [FIREBASE PUSH] Sending Notification:\n   Topic: ${topic}\n   Title: ${title}\n   Body: ${body}\n`);
}

export async function sendSMS(phone: string, message: string) {
  console.log(`\n📱 [SMS SERVICE] Sending SMS:\n   Phone: ${phone}\n   Message: ${message}\n`);
}
