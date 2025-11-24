// Dependencies: npm install express jsonwebtoken
const express = require('express');
const router = express.Router();
const User = require('../models/Users'); 
const jwt = require('jsonwebtoken');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email'); 

const JWT_SECRET = 'your_super_secret_jwt_key_shhh'; 

// --- ROUTE 1 & 2: Registration & Email Verification (omitted for brevity) ---
router.post('/register', async (req, res) => {
  const { fullName, email, password, role } = req.body;
  if (!fullName || !email || !password || !role) {
    return res.status(400).json({ message: 'Please enter all required fields.' });
  }
  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }
    user = new User({ fullName, email, password, role });
    await sendVerificationEmail(user); 
    const token = jwt.sign(
      { userId: user._id, role: user.role, isVerified: user.isVerified }, 
      JWT_SECRET,
      { expiresIn: '1h' } 
    );
    res.status(201).json({ 
      message: 'Registration successful! Please check your email to verify your account.', 
      token, 
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, isVerified: user.isVerified }
    });
  } catch (err) {
    console.error('Registration/Email Error:', err.message);
    res.status(500).json({ 
      message: 'Server error during registration or email send. Check server logs for details.', 
      error: err.message 
    });
  }
});

router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).send('Verification link is invalid or missing.');
  }
  try {
    const user = await User.findOne({ 
      verificationToken: token, 
      verificationTokenExpires: { $gt: Date.now() } 
    });
    if (!user) {
      return res.status(400).send('Verification link is invalid or has expired.');
    }
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();
    res.status(200).send('<h1>✅ Email Successfully Verified!</h1><p>You can now close this window and log into the application.</p>');
  } catch (err) {
    console.error('Email verification error:', err);
    res.status(500).send('Server error during verification.');
  }
});


// --- ROUTE 3: POST /api/forgot-password (Initiates Reset from Flutter App) ---
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            // Send a generic success message for security
            return res.status(200).json({ message: 'If that email exists, a password reset link has been sent.' });
        }

        await sendPasswordResetEmail(user);

        res.status(200).json({ message: 'Password reset link sent. Check your inbox.' });

    } catch (err) {
        console.error('Forgot password error:', err.message);
        res.status(500).json({ message: 'Server error: Could not process reset request.' });
    }
});


// --- ROUTE 4: GET /api/reset-password/:token (VERIFIES TOKEN & SERVES HTML FORM TO BROWSER) ---
router.get('/reset-password/:token', async (req, res) => {
    try {
        const user = await User.findOne({ 
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() } // Token must be non-expired
        });

        if (!user) {
            // Display error in browser
            return res.status(400).send('<h1>Link Error</h1><p>Password reset link is invalid or has expired. Please restart the process from the app.</p>');
        }

        // --- SERVE THE HTML FORM (User's browser will see this) ---
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Reset Password</title>
                <style>
                    body { font-family: Arial, sans-serif; background-color: #0D0D0D; color: #FFFFFF; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                    .container { background-color: #1A1A1A; padding: 40px; border-radius: 10px; width: 350px; text-align: center; border: 1px solid #FF9800; }
                    h2 { color: #FF9800; margin-bottom: 20px; }
                    input { width: 90%; padding: 10px; margin: 10px 0; border: 1px solid #FF9800; border-radius: 5px; background-color: #121212; color: white; }
                    button { background-color: #FF9800; color: black; padding: 12px 20px; border: none; border-radius: 5px; cursor: pointer; width: 100%; margin-top: 20px; font-weight: bold; }
                    #error { color: red; margin-top: 10px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>Set New Password</h2>
                    <form action="/api/reset-password/${req.params.token}" method="POST" onsubmit="return validateForm()">
                        <input type="password" id="password" name="password" placeholder="New Password" required minlength="6">
                        <input type="password" id="confirmPassword" name="confirmPassword" placeholder="Confirm New Password" required minlength="6">
                        <div id="error"></div>
                        <button type="submit">Reset Password</button>
                    </form>
                    <script>
                        function validateForm() {
                            const password = document.getElementById('password').value;
                            const confirmPassword = document.getElementById('confirmPassword').value;
                            const errorDiv = document.getElementById('error');
                            
                            if (password !== confirmPassword) {
                                errorDiv.innerText = 'Passwords do not match.';
                                return false;
                            }
                            return true;
                        }
                    </script>
                </div>
            </body>
            </html>
        `);

    } catch (err) {
        console.error('Reset link error:', err);
        res.status(500).send('<h1>Server Error</h1><p>Could not validate reset link.</p>');
    }
});


// --- ROUTE 5: POST /api/reset-password/:token (RECEIVES FORM SUBMISSION & UPDATES DB) ---
router.post('/reset-password/:token', async (req, res) => {
    // Data comes from the HTML form (req.body)
    const { password, confirmPassword } = req.body; 

    try {
        if (password !== confirmPassword) {
            return res.status(400).send('Passwords do not match.');
        }

        const user = await User.findOne({ 
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() } 
        });

        if (!user) {
            return res.status(400).send('<h1>Error</h1><p>Token is invalid or has expired. Please restart the process.</p>');
        }

        // Update the password and clear the reset fields
        user.password = password; // Hashing is handled automatically by the pre('save') hook!
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).send('<h1>✅ Success!</h1><p>Password successfully reset. You can now log in to the Flutter application.</p>');

    } catch (err) {
        console.error('Password update error:', err);
        res.status(500).send('<h1>Error</h1><p>Server error: Could not update password.</p>');
    }
});


// --- ROUTE 6: POST /api/login (Login and Verification Check) ---
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please enter both email and password.' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid Credentials.' });
    }
    
    // CHECK: PREVENT UNVERIFIED LOGIN 
    if (!user.isVerified) {
      return res.status(401).json({ message: 'Account not verified. Please check your email for the verification link.' });
    }

    const isMatch = await user.comparePassword(password); 

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Credentials.' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role, isVerified: user.isVerified }, 
      JWT_SECRET,
      { expiresIn: '1h' } 
    );

    res.json({ 
      message: 'Login successful', 
      token, 
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, isVerified: user.isVerified }
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error during login.', error: err.message });
  }
});

module.exports = router;