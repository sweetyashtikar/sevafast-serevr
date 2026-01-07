const nodemailer = require('nodemailer');
const {GOOGLE_SMTP_HOST, GOOGLE_SMTP_PORT, GOOGLE_SMTP_USER, GOOGLE_SMTP_PASS, GOOGLE_FROM_NAME} = require('../env-variables');

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit OTP
}

const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        host: GOOGLE_SMTP_HOST,
        port: GOOGLE_SMTP_PORT,
        auth: {
            user: GOOGLE_SMTP_USER,
            pass: GOOGLE_SMTP_PASS,
        },
    });

    const message = {
        from: `"${GOOGLE_FROM_NAME}" <${GOOGLE_SMTP_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
    };

    await transporter.sendMail(message);
};

module.exports = {  sendEmail, generateOTP};
