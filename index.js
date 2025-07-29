// index.js (Educe Backend)

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');
const path = require('path');

const app = express();

    console.log('DEBUG: process.env.PORT is', process.env.PORT);

const PORT = process.env.PORT || 4000;

// Firebase Admin Init
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Nodemailer Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Routes

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Check if username is available
app.get('/api/check-username/:username', async (req, res) => {
  const { username } = req.params;
  const userRef = db.collection('users').doc(username);
  const doc = await userRef.get();
  if (doc.exists) {
    return res.json({ available: false });
  }
  return res.json({ available: true });
});

// Send OTP
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000;

  try {
    await db.collection('otps').doc(email).set({ otp, expiresAt });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP is: ${otp}. It will expire in 5 minutes.`
    });

    res.json({ message: 'OTP sent successfully.' });
  } catch (error) {
    console.error('OTP send error:', error);
    res.status(500).json({ message: 'Failed to send OTP.' });
  }
});

// Verify OTP
app.post('/api/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required.' });

  try {
    const doc = await db.collection('otps').doc(email).get();
    if (!doc.exists) return res.status(400).json({ message: 'OTP not found.' });

    const { otp: savedOtp, expiresAt } = doc.data();

    if (Date.now() > expiresAt) {
      await db.collection('otps').doc(email).delete();
      return res.status(400).json({ message: 'OTP expired.' });
    }

    if (savedOtp !== otp) {
      return res.status(400).json({ message: 'Incorrect OTP.' });
    }

    res.json({ message: 'OTP verified successfully.' });
  } catch (err) {
    console.error('OTP verify error:', err);
    res.status(500).json({ message: 'Error verifying OTP.' });
  }
});

// Register new user
app.post('/api/signup', async (req, res) => {
  const {
    username,
    email,
    firstName,
    lastName,
    role,
    dobYear,
    parentEmail,
    isGoogleSignup
  } = req.body;

  if (!username || !email || !firstName || !lastName || !role || !dobYear) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  const userAge = new Date().getFullYear() - parseInt(dobYear);

  if (role === 'mentor' && userAge < 13) {
    return res.status(400).json({
      message: 'You must be 13 or older to sign up as a mentor.'
    });
  }

  if (userAge < 13 && !parentEmail) {
    return res.status(400).json({
      message: 'Under 13 requires parent email.'
    });
  }

  try {
    const userRef = db.collection('users').doc(username);
    const doc = await userRef.get();
    if (doc.exists) {
      return res.status(400).json({ message: 'Username already taken.' });
    }

    await userRef.set({
      email,
      firstName,
      lastName,
      role,
      dobYear,
      parentEmail: userAge < 13 ? parentEmail : null,
      isGoogleSignup: !!isGoogleSignup,
      createdAt: Date.now()
    });

    res.json({ message: 'Account created successfully.' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Failed to create account.' });
  }
});

app.listen(PORT, () => {
  console.log(`\u2705 Educe Backend Server running at http://localhost:${PORT}`);
});
