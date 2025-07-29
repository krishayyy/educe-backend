// index.js (Educe Backend)

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin'); // Firebase Admin SDK
const path = require('path');

const app = express();

// Use process.env.PORT for Render deployment, fallback to 4000 for local development
console.log('DEBUG: process.env.PORT is', process.env.PORT); // Temporary debug log
const PORT = process.env.PORT || 4000;

// Firebase Admin Init
// IMPORTANT: Ensure serviceAccountKey.json is in the root of your project
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore(); // Firestore instance

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files like signup.html

// Nodemailer Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Ensure these env vars are set on Render
    pass: process.env.EMAIL_PASS, // Ensure these env vars are set on Render
  },
});

// Routes

// Root route - serves your signup.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/signup.html')); // Changed to signup.html
});

// Check if username is available (uses Firestore)
app.get('/api/check-username/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const userRef = db.collection('users').doc(username);
    const doc = await userRef.get();
    if (doc.exists) {
      return res.json({ available: false });
    }
    return res.json({ available: true });
  } catch (error) {
    console.error('Error checking username:', error);
    res.status(500).json({ message: 'Error checking username availability.' });
  }
});

// Send OTP (uses Firestore for storage)
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // OTP valid for 5 minutes

  try {
    // Store OTP in Firestore
    await db.collection('otps').doc(email).set({ otp, expiresAt });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Educe OTP Code',
      text: `Your OTP is: ${otp}. It will expire in 5 minutes.`
    });

    res.json({ message: 'OTP sent successfully.' });
  } catch (error) {
    console.error('OTP send error:', error);
    res.status(500).json({ message: 'Failed to send OTP.' });
  }
});

// Verify OTP (uses Firestore for retrieval and deletion)
app.post('/api/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required.' });

  try {
    const doc = await db.collection('otps').doc(email).get();
    if (!doc.exists) return res.status(400).json({ message: 'OTP not found or expired.' });

    const { otp: savedOtp, expiresAt } = doc.data();

    if (Date.now() > expiresAt) {
      await db.collection('otps').doc(email).delete(); // Delete expired OTP
      return res.status(400).json({ message: 'OTP expired.' });
    }

    if (savedOtp !== otp) {
      return res.status(400).json({ message: 'Incorrect OTP.' });
    }

    // OTP verified, delete it to prevent reuse
    await db.collection('otps').doc(email).delete();
    res.json({ message: 'OTP verified successfully.' });
  } catch (err) {
    console.error('OTP verify error:', err);
    res.status(500).json({ message: 'Error verifying OTP.' });
  }
});

// Register new user (uses Firestore)
app.post('/api/signup', async (req, res) => {
  const {
    username,
    email,
    password, // Assuming password will be handled (e.g., hashed)
    firstName,
    lastName,
    role,
    dobYear,
    parentEmail,
    isGoogleSignup
  } = req.body;

  // Basic validation
  if (!username || !email || !password || !firstName || !lastName || !role || !dobYear) {
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
    // Check if username already exists in Firestore
    const userRef = db.collection('users').doc(username);
    const doc = await userRef.get();
    if (doc.exists) {
      return res.status(400).json({ message: 'Username already taken.' });
    }

    // Save user data to Firestore
    await userRef.set({
      email,
      password, // In a real app, hash this password!
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


// Start the server
app.listen(PORT, () => {
  console.log(`✅ Educe Backend Server running at http://localhost:${PORT}`);
  console.log(`   Serving signup page at http://localhost:${PORT}/`);
});
