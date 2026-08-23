// utils/email.js
// Handles all outgoing emails (OTP verification, password reset, monthly reports).
// Uses Nodemailer. For development, we auto-create an Ethereal test account if no SMTP creds are set.

const nodemailer = require('nodemailer');

let transporter = null;

// createTransporter: initializes the email transport once
async function createTransporter() {
  if (transporter) return transporter; // reuse existing

  // If real email credentials are provided in .env, use them
  if (process.env.EMAIL_USER && process.env.EMAIL_USER !== 'placeholder@ethereal.email') {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    console.log('📧 Using configured email provider');
  } else {
    // Auto-create a free Ethereal test account for demo purposes
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    console.log('📧 Ethereal test email active. Preview URL will be logged per email.');
    console.log('   Ethereal user:', testAccount.user);
  }

  return transporter;
}

// sendOTPEmail: sends a 6-digit OTP for verification or password reset
async function sendOTPEmail(toEmail, otp, purpose) {
  const transport = await createTransporter();
  const subject = purpose === 'verify' ? 'Verify your CampusConnect account' : 'Reset your CampusConnect password';
  const action = purpose === 'verify' ? 'verify your email address' : 'reset your password';

  const info = await transport.sendMail({
    from: '"CampusConnect" <no-reply@campusconnect.com>',
    to: toEmail,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #4f46e5;">CampusConnect</h2>
        <p>Hi! Use the OTP below to ${action}:</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #4f46e5; padding: 16px 0;">${otp}</div>
        <p style="color: #6b7280; font-size: 14px;">This OTP expires in 10 minutes. Do not share it with anyone.</p>
      </div>
    `
  });

  // If using Ethereal, log the preview URL so you can check the email
  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) {
    console.log('📨 Email preview URL:', preview);
  }

  return info;
}

// sendMonthlyReportEmail: sends the monthly performance summary
async function sendMonthlyReportEmail(toEmail, studentName, report) {
  const transport = await createTransporter();

  const info = await transport.sendMail({
    from: '"CampusConnect" <no-reply@campusconnect.com>',
    to: toEmail,
    subject: `Your CampusConnect Monthly Report — ${report.monthName} ${report.year}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #4f46e5;">📊 Monthly Report — ${report.monthName} ${report.year}</h2>
        <p>Hi ${studentName},</p>
        <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
          <tr style="background:#f3f4f6;">
            <td style="padding:10px; border: 1px solid #e5e7eb;">Tasks Completed</td>
            <td style="padding:10px; border: 1px solid #e5e7eb;">${report.tasks_completed} / ${report.tasks_total}</td>
          </tr>
          <tr>
            <td style="padding:10px; border: 1px solid #e5e7eb;">Completion Rate</td>
            <td style="padding:10px; border: 1px solid #e5e7eb;">${report.completion_pct}%</td>
          </tr>
          <tr style="background:#f3f4f6;">
            <td style="padding:10px; border: 1px solid #e5e7eb;">Average Attendance</td>
            <td style="padding:10px; border: 1px solid #e5e7eb;">${report.attendance_pct}%</td>
          </tr>
          ${report.worst_subject ? `<tr><td style="padding:10px; border: 1px solid #e5e7eb;">Subject Needing Attention</td><td style="padding:10px; border: 1px solid #e5e7eb;">${report.worst_subject}</td></tr>` : ''}
        </table>
        <div style="background:#eff6ff; border-left: 4px solid #4f46e5; padding: 12px 16px; margin-top: 16px;">
          <strong>Feedback:</strong> ${report.feedback}
        </div>
        <p style="color:#9ca3af; font-size:12px; margin-top:24px;">This is an automated report from CampusConnect.</p>
      </div>
    `
  });

  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) console.log('📨 Monthly report email preview:', preview);

  return info;
}

module.exports = { sendOTPEmail, sendMonthlyReportEmail };
