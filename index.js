// index.js (Educe Backend)

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin'); // Firebase Admin SDK
const path = require('path');

const app = express();
<<<<<<< HEAD

// DEBUG: This line helps confirm the PORT environment variable on Render
console.log('DEBUG: process.env.PORT is', process.env.PORT);

// Use process.env.PORT for Render deployment, fallback to 4000 for local development
const PORT = process.env.PORT || 4000;

// Firebase Admin Init
// IMPORTANT: Read service account key from environment variable for security
let serviceAccount;
try {
  // Attempt to parse the service account key from the environment variable
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} catch (e) {
  // If parsing fails (e.g., env var is missing or malformed JSON),
  // log an error and attempt to load from a local file (for development)
  console.error("Error parsing FIREBASE_SERVICE_ACCOUNT_KEY environment variable:", e);
  console.warn("Attempting to load serviceAccountKey.json from local file for development. This file should NOT be committed to Git.");
  try {
    serviceAccount = require('./serviceAccountKey.json');
  } catch (fileError) {
    console.error("Could not load serviceAccountKey.json locally either:", fileError);
    // If neither method works, it's a critical configuration error, so exit.
    process.exit(1);
  }
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

=======

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

>>>>>>> afd660ae3f565773dfdfc84ec872e043af2e187d
// Nodemailer Setup
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use 'gmail' for Gmail SMTP
  auth: {
<<<<<<< HEAD
    user: process.env.EMAIL_USER, // Your Gmail address from .env (or Render env var)
    pass: process.env.EMAIL_PASS, // Your Gmail App Password from .env (or Render env var)
=======
    user: process.env.EMAIL_USER, // Ensure these env vars are set on Render
    pass: process.env.EMAIL_PASS, // Ensure these env vars are set on Render
>>>>>>> afd660ae3f565773dfdfc84ec872e043af2e187d
  },
});

// Routes

<<<<<<< HEAD
// Root route - serves your index.html (or change to signup.html if preferred)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Check if username is available
=======
// Root route - serves your signup.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/signup.html')); // Changed to signup.html
});

// Check if username is available (uses Firestore)
>>>>>>> afd660ae3f565773dfdfc84ec872e043af2e187d
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

<<<<<<< HEAD
// Send OTP
=======
// Send OTP (uses Firestore for storage)
>>>>>>> afd660ae3f565773dfdfc84ec872e043af2e187d
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // OTP valid for 5 minutes

  try {
<<<<<<< HEAD
=======
    // Store OTP in Firestore
>>>>>>> afd660ae3f565773dfdfc84ec872e043af2e187d
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

<<<<<<< HEAD
// Verify OTP
=======
// Verify OTP (uses Firestore for retrieval and deletion)
>>>>>>> afd660ae3f565773dfdfc84ec872e043af2e187d
app.post('/api/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required.' });

  try {
    const doc = await db.collection('otps').doc(email).get();
<<<<<<< HEAD
    if (!doc.exists) return res.status(400).json({ message: 'OTP not found.' });
=======
    if (!doc.exists) return res.status(400).json({ message: 'OTP not found or expired.' });
>>>>>>> afd660ae3f565773dfdfc84ec872e043af2e187d

    const { otp: savedOtp, expiresAt } = doc.data();

    if (Date.now() > expiresAt) {
      await db.collection('otps').doc(email).delete(); // Delete expired OTP
      return res.status(400).json({ message: 'OTP expired.' });
    }

    if (savedOtp !== otp) {
      return res.status(400).json({ message: 'Incorrect OTP.' });
    }

<<<<<<< HEAD
    // OTP verified successfully, now delete it to prevent reuse
=======
    // OTP verified, delete it to prevent reuse
>>>>>>> afd660ae3f565773dfdfc84ec872e043af2e187d
    await db.collection('otps').doc(email).delete();
    res.json({ message: 'OTP verified successfully.' });
  } catch (err) {
    console.error('OTP verify error:', err);
    res.status(500).json({ message: 'Error verifying OTP.' });
  }
});

<<<<<<< HEAD
// Register new user
=======
// Register new user (uses Firestore)
>>>>>>> afd660ae3f565773dfdfc84ec872e043af2e187d
app.post('/api/signup', async (req, res) => {
  const {
    username,
    email,
<<<<<<< HEAD
    password, // <-- ADDED: Destructure password from request body
=======
    password, // Assuming password will be handled (e.g., hashed)
>>>>>>> afd660ae3f565773dfdfc84ec872e043af2e187d
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

<<<<<<< HEAD
    // --- IMPORTANT SECURITY NOTE: In a real application, you MUST hash the password before storing it. ---
    // Example (requires a library like bcrypt):
    // const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds
    // Use hashedPassword in userRef.set below instead of plain 'password'

    // Save user data to Firestore
    await userRef.set({
      email,
      password, // <-- ADDED: Store the password (remember to hash in production!)
=======
    // Save user data to Firestore
    await userRef.set({
      email,
      password, // In a real app, hash this password!
>>>>>>> afd660ae3f565773dfdfc84ec872e043af2e187d
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

<<<<<<< HEAD
=======

>>>>>>> afd660ae3f565773dfdfc84ec872e043af2e187d
// Start the server
app.listen(PORT, () => {
  console.log(`✅ Educe Backend Server running at http://localhost:${PORT}`);
  console.log(`   Serving signup page at http://localhost:${PORT}/`);
});
