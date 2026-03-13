const dotenv = require('dotenv');
dotenv.config();

const MONGODB_URI = process.env.MONGODB;

const PORT = process.env.PORT || 5000;

const NODE_ENV = process.env.NODE_ENV || 'development';

const GOOGLE_SMTP_USER = process.env.GOOGLE_SMTP_USER;

const GOOGLE_SMTP_PASS = process.env.GOOGLE_SMTP_PASS;

const GOOGLE_SMTP_PORT = process.env.GOOGLE_SMTP_PORT;

const GOOGLE_FROM_NAME = process.env.GOOGLE_FROM_NAME;

const GOOGLE_SMTP_HOST = process.env.GOOGLE_SMTP_HOST;

const JWT_SECRET = process.env.JWT_SECRET;

const JWT_EXPIRE = process.env.JWT_EXPIRE;

const FRONTEND_URL = process.env.FRONTEND_URL

const TEZ_PAYMENT_API_KEY = process.env.TEZ_PAYMENT_API_KEY

const RAZORPAY_KEY = process.env.RAZORPAY_KEY

const RAZORPAY_SECRET = process.env.RAZORPAY_SECRET


module.exports = {
  MONGODB_URI,
  PORT,
  GOOGLE_SMTP_PASS,
  GOOGLE_SMTP_PORT,
  GOOGLE_FROM_NAME,
  JWT_SECRET,
  JWT_EXPIRE,
  GOOGLE_SMTP_HOST,
  GOOGLE_SMTP_USER,
  NODE_ENV,
  FRONTEND_URL,
  TEZ_PAYMENT_API_KEY,
  RAZORPAY_KEY,
  RAZORPAY_SECRET
};