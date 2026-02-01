// app.js (complete version)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const router = express.Router();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const paymentRoutes = require('../controllers/razorpaycontroller');
app.use('/api/payments', paymentRoutes);


