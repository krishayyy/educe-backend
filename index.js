// index.js - Educe Backend Server

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

const PORT = 4000;

const OTP_STORE = {};
const USERS_DB = [];

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// Your existing API endpoints here (send-otp, verify-otp, check-username, signup)...

// Example: Send OTP Endpoint
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email || email.trim() === '') {
    return res.status(400).json({ message: 'Email is required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  OTP_STORE[email] = otp;

  try {
    await transporter.sendMail({
      from: `"Educe" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Your Educe Confirmation Code (OTP)',
      html: `<p>Your OTP is: <strong>${otp}</strong></p>`
    });
    res.status(200).json({ message: 'OTP sent successfully.' });
  } catch (err) {
    console.error('Error sending OTP:', err);
    res.status(500).json({ message: 'Failed to send OTP. Please try again later.' });
  }
});

// ... include other endpoints here as before ...

app.listen(PORT, () => {
  console.log(`✅ Educe Backend Server running at http://localhost:${PORT}`);
  console.log(`   Serving signup page at http://localhost:${PORT}/`);
});
