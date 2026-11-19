const nodemailer = require('nodemailer');

const getEnv = (key, fallbackKey) => {
  return process.env[key] || (fallbackKey ? process.env[fallbackKey] : undefined);
};

// Create transporter
const createTransporter = () => {
  const host = getEnv('SMTP_HOST', 'EMAIL_HOST');
  const port = Number(getEnv('SMTP_PORT', 'EMAIL_PORT')) || 587;
  const user = getEnv('SMTP_USER', 'EMAIL_USER');
  const pass = getEnv('SMTP_PASS', 'EMAIL_PASSWORD');
  const secure = String(getEnv('SMTP_SECURE', 'EMAIL_SECURE') || '').toLowerCase() === 'true' || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    }
  });
};

exports.sendStudentWelcomeCredentialsEmail = async ({ name, email, password }) => {
  const loginUrl = `${process.env.FRONTEND_URL}/login`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Welcome to SES Educare!</h2>
      <p>Dear ${name},</p>
      <p>Your student account has been created successfully.</p>
      <p><strong>Website:</strong> <a href="${process.env.FRONTEND_URL}">${process.env.FRONTEND_URL}</a></p>
      <p><strong>Login details:</strong></p>
      <ul>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Password:</strong> ${password}</li>
      </ul>
      <a href="${loginUrl}"
         style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
        Login
      </a>
      <p>For security, please change your password after your first login.</p>
      <p>Best regards,<br>SES Educare Team</p>
    </div>
  `;

  await exports.sendEmail({
    email,
    subject: 'Welcome to SES Educare - Your Login Credentials',
    html
  });
};

// Franchise Welcome Email with Credentials
exports.sendFranchiseWelcomeCredentialsEmail = async ({ name, email, password, franchiseName, franchiseCode }) => {
  const loginUrl = `${process.env.FRONTEND_URL}/login`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #2563eb; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">SES Educare</h1>
      </div>
      <div style="padding: 30px; line-height: 1.6; color: #374151;">
        <h2 style="color: #1e40af; margin-top: 0;">Welcome to our Network!</h2>
        <p>Dear ${name},</p>
        <p>Congratulations! Your franchise account for <strong>${franchiseName}</strong> has been created successfully.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <p style="margin-top: 0;"><strong>Franchise Details:</strong></p>
          <ul style="margin-bottom: 0;">
            <li><strong>Franchise Name:</strong> ${franchiseName}</li>
            <li><strong>Franchise Code:</strong> ${franchiseCode}</li>
          </ul>
          <p style="margin-top: 15px;"><strong>Login Credentials:</strong></p>
          <ul style="margin-bottom: 0;">
            <li><strong>Portal URL:</strong> <a href="${process.env.FRONTEND_URL}" style="color: #2563eb;">${process.env.FRONTEND_URL}</a></li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Password:</strong> ${password}</li>
          </ul>
        </div>
        <div style="text-align: center;">
          <a href="${loginUrl}"
             style="display: inline-block; padding: 14px 30px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0;">
            Login to Admin Panel
          </a>
        </div>
        <p style="font-size: 0.9em; color: #6b7280; margin-top: 25px;">
          For security reasons, please change your password immediately after your first login.
        </p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        <p style="margin-bottom: 0;">Best regards,</p>
        <p style="margin-top: 5px; font-weight: bold; color: #1e40af;">SES Educare Team</p>
      </div>
    </div>
  `;

  await exports.sendEmail({
    email,
    subject: `Welcome to SES Educare - Franchise Credentials for ${franchiseName}`,
    html
  });
};

// Staff Welcome Email with Credentials
exports.sendStaffWelcomeCredentialsEmail = async ({ name, email, password, designation }) => {
  const loginUrl = `${process.env.FRONTEND_URL}/login`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #059669; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">SES Educare</h1>
      </div>
      <div style="padding: 30px; line-height: 1.6; color: #374151;">
        <h2 style="color: #065f46; margin-top: 0;">Welcome to the Team!</h2>
        <p>Dear ${name},</p>
        <p>We are excited to have you join us as a <strong>${designation}</strong>.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <p style="margin-top: 0;"><strong>Your Login Credentials:</strong></p>
          <ul style="margin-bottom: 0;">
            <li><strong>Portal URL:</strong> <a href="${process.env.FRONTEND_URL}" style="color: #059669;">${process.env.FRONTEND_URL}</a></li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Password:</strong> ${password}</li>
          </ul>
        </div>
        <div style="text-align: center;">
          <a href="${loginUrl}"
             style="display: inline-block; padding: 14px 30px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0;">
            Access Staff Portal
          </a>
        </div>
        <p style="font-size: 0.9em; color: #6b7280; margin-top: 25px;">
          Please change your password after logging in for the first time.
        </p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        <p style="margin-bottom: 0;">Best regards,</p>
        <p style="margin-top: 5px; font-weight: bold; color: #065f46;">SES Educare HR Team</p>
      </div>
    </div>
  `;

  await exports.sendEmail({
    email,
    subject: 'Welcome to SES Educare - Staff Portal Credentials',
    html
  });
};

// Send Email
exports.sendEmail = async (options) => {
  const transporter = createTransporter();

  const from = getEnv('SMTP_FROM') || `${getEnv('EMAIL_FROM') || 'SES Educare'} <${getEnv('SMTP_USER', 'EMAIL_USER')}>`;

  const mailOptions = {
    from,
    to: options.email,
    subject: options.subject,
    html: options.html || options.message
  };

  if (options.attachments) {
    mailOptions.attachments = options.attachments;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email error:', error);
    throw error;
  }
};

// Welcome Email
exports.sendWelcomeEmail = async (user) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Welcome to SES Educare!</h2>
      <p>Dear ${user.name},</p>
      <p>Thank you for joining SES Educare. We're excited to have you on board!</p>
      <p>Your account has been successfully created with the following details:</p>
      <ul>
        <li><strong>Email:</strong> ${user.email}</li>
        <li><strong>Role:</strong> ${user.role}</li>
      </ul>
      <p>You can now log in to your dashboard and start exploring our courses.</p>
      <a href="${process.env.FRONTEND_URL}/login" 
         style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
        Login to Dashboard
      </a>
      <p>If you have any questions, feel free to contact our support team.</p>
      <p>Best regards,<br>SES Educare Team</p>
    </div>
  `;

  await exports.sendEmail({
    email: user.email,
    subject: 'Welcome to SES Educare',
    html
  });
};

// Password Reset Email
exports.sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Password Reset Request</h2>
      <p>Dear ${user.name},</p>
      <p>You requested to reset your password. Click the button below to reset it:</p>
      <a href="${resetUrl}" 
         style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
        Reset Password
      </a>
      <p>This link will expire in 30 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br>SES Educare Team</p>
    </div>
  `;

  await exports.sendEmail({
    email: user.email,
    subject: 'Password Reset Request',
    html
  });
};

// Certificate Issued Email
exports.sendCertificateEmail = async (student, certificate) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">🎓 Congratulations! Certificate Issued</h2>
      <p>Dear ${student.personalInfo.firstName},</p>
      <p>Congratulations on successfully completing <strong>${certificate.courseName}</strong>!</p>
      <p>Your certificate has been generated with the following details:</p>
      <ul>
        <li><strong>Certificate Number:</strong> ${certificate.certificateNumber}</li>
        <li><strong>Course:</strong> ${certificate.courseName}</li>
        <li><strong>Grade:</strong> ${certificate.grade}</li>
        <li><strong>Issue Date:</strong> ${new Date(certificate.issueDate).toLocaleDateString('en-IN')}</li>
      </ul>
      <p>You can download your certificate from your dashboard or verify it using the verification code: <strong>${certificate.verificationCode}</strong></p>
      <a href="${process.env.FRONTEND_URL}/student/certificates" 
         style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
        View Certificate
      </a>
      <p>Best regards,<br>SES Educare Team</p>
    </div>
  `;

  await exports.sendEmail({
    email: student.contactInfo.email,
    subject: 'Certificate Issued - SES Educare',
    html,
    attachments: certificate.pdfPath ? [{
      filename: `certificate_${certificate.certificateNumber}.pdf`,
      path: certificate.pdfPath
    }] : []
  });
};

// Payment Receipt Email
exports.sendPaymentReceiptEmail = async (student, payment) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Payment Receipt</h2>
      <p>Dear ${student.personalInfo.firstName},</p>
      <p>Thank you for your payment. Here are the details:</p>
      <ul>
        <li><strong>Receipt Number:</strong> ${payment.receiptNumber}</li>
        <li><strong>Amount:</strong> ₹${payment.amount}</li>
        <li><strong>Payment Method:</strong> ${payment.paymentMethod}</li>
        <li><strong>Date:</strong> ${new Date(payment.paymentDate).toLocaleDateString('en-IN')}</li>
        <li><strong>Status:</strong> ${payment.paymentStatus}</li>
      </ul>
      <p>Your payment has been successfully processed.</p>
      <a href="${process.env.FRONTEND_URL}/student/payments" 
         style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
        View Payment History
      </a>
      <p>Best regards,<br>SES Educare Team</p>
    </div>
  `;

  await exports.sendEmail({
    email: student.contactInfo.email,
    subject: `Payment Receipt - ${payment.receiptNumber}`,
    html,
    attachments: payment.receiptPDF ? [{
      filename: `receipt_${payment.receiptNumber}.pdf`,
      path: payment.receiptPDF
    }] : []
  });
};

// Exam Result Email
exports.sendExamResultEmail = async (student, examResult) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Exam Results Published</h2>
      <p>Dear ${student.personalInfo.firstName},</p>
      <p>Your exam results are now available!</p>
      <ul>
        <li><strong>Course:</strong> ${examResult.courseName}</li>
        <li><strong>Score:</strong> ${examResult.score}/${examResult.totalMarks}</li>
        <li><strong>Percentage:</strong> ${examResult.percentage}%</li>
        <li><strong>Grade:</strong> ${examResult.grade}</li>
      </ul>
      <a href="${process.env.FRONTEND_URL}/student/results" 
         style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
        View Detailed Results
      </a>
      <p>Best regards,<br>SES Educare Team</p>
    </div>
  `;

  await exports.sendEmail({
    email: student.contactInfo.email,
    subject: 'Exam Results - SES Educare',
    html
  });
};

// Admission Confirmation Email
exports.sendAdmissionConfirmationEmail = async (student, course) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">🎉 Admission Confirmed!</h2>
      <p>Dear ${student.personalInfo.firstName},</p>
      <p>Congratulations! Your admission has been confirmed for:</p>
      <ul>
        <li><strong>Course:</strong> ${course.title}</li>
        <li><strong>Student ID:</strong> ${student.studentId}</li>
        <li><strong>Admission Date:</strong> ${new Date(student.admissionDate).toLocaleDateString('en-IN')}</li>
      </ul>
      <p>Welcome to SES Educare! We look forward to helping you achieve your educational goals.</p>
      <a href="${process.env.FRONTEND_URL}/student/dashboard" 
         style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
        Go to Dashboard
      </a>
      <p>Best regards,<br>SES Educare Team</p>
    </div>
  `;

  await exports.sendEmail({
    email: student.contactInfo.email,
    subject: 'Admission Confirmed - SES Educare',
    html
  });
};

// Franchise Approval Email
exports.sendFranchiseApprovalEmail = async (franchise, admin) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Franchise Approved!</h2>
      <p>Dear ${franchise.owner.name},</p>
      <p>Congratulations! Your franchise application has been approved.</p>
      <ul>
        <li><strong>Franchise Name:</strong> ${franchise.name}</li>
        <li><strong>Franchise Code:</strong> ${franchise.code}</li>
        <li><strong>Location:</strong> ${franchise.address.city}, ${franchise.address.state}</li>
      </ul>
      <p>Your admin credentials:</p>
      <ul>
        <li><strong>Email:</strong> ${admin.email}</li>
        <li><strong>Username:</strong> ${admin.username}</li>
      </ul>
      <a href="${process.env.FRONTEND_URL}/franchise/login" 
         style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
        Login to Dashboard
      </a>
      <p>Best regards,<br>SES Educare Team</p>
    </div>
  `;

  await exports.sendEmail({
    email: franchise.owner.email,
    subject: 'Franchise Approved - SES Educare',
    html
  });
};

module.exports = exports;
