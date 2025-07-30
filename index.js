// index.js (Educe Backend)

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin'); // Firebase Admin SDK
const path = require('path');

const app = express();

// DEBUG: This line helps confirm the PORT environment variable on Render
console.log('DEBUG: process.env.PORT is', process.env.PORT);

// Use process.env.PORT for Render deployment, fallback to 4000 for local development
const PORT = process.env.PORT || 4000;

// Firebase Admin Init
// IMPORTANT: Read service account key from environment variable for security
let serviceAccount;
try {
  // Attempt to parse the service account key from the environment variable
  // This is the ONLY way to get the service account key in production on Render
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} catch (e) {
  // If parsing fails (e.g., env var is missing or malformed JSON),
  // it's a critical configuration error, so log and exit.
  console.error("CRITICAL ERROR: Could not parse FIREBASE_SERVICE_ACCOUNT_KEY environment variable.");
  console.error("Please ensure FIREBASE_SERVICE_ACCOUNT_KEY is set correctly on Render with valid JSON content.");
  console.error("Error details:", e);
  process.exit(1); // Exit the application as it cannot function without Firebase credentials
}

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore(); // Get Firestore instance

// Middleware
app.use(cors()); // Enable CORS for cross-origin requests
app.use(express.json()); // Parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public' folder

// Nodemailer Setup
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use 'gmail' for Gmail SMTP
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail address from .env (or Render env var)
    pass: process.env.EMAIL_PASS, // Your Gmail App Password from .env (or Render env var)
  },
});

// Routes

// Root route - serves your index.html (or change to signup.html if preferred)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Check if username is available
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

// Send OTP
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // OTP valid for 5 minutes

  try {
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

// Verify OTP
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

    // OTP verified successfully, now delete it to prevent reuse
    await db.collection('otps').doc(email).delete();
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
    password, // Destructure password from request body
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

    // --- IMPORTANT SECURITY NOTE: In a real application, you MUST hash the password before storing it. ---
    // Example (requires a library like bcrypt):
    // const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds
    // Use hashedPassword in userRef.set below instead of plain 'password'

    // Save user data to Firestore
    await userRef.set({
      email,
      password, // Store the password (remember to hash in production!)
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
