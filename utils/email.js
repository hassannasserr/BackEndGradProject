const nodemailer = require('nodemailer');
const crypto = require('crypto'); 

const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: 'failurepredictivesystem@gmail.com',
        pass: 'mlokqvelswnrqvde'

    }
});
async function sendVerificationEmail(user) {
    const token = crypto.randomBytes(20).toString('hex');
    user.verificationToken = token;
    user.verificationTokenExpires = Date.now() + 3600000 * 24; // 24 hours

    await user.save(); 

    // Use environment variable for base URL or default to localhost
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/api/verify-email?token=${token}`;

    const mailOptions = {
        to: user.email,
        from: `Registration <${transporter.options.auth.user}>`,
        subject: 'Verify Your Email Address',
        html: `
            <div style="font-family: Arial, sans-serif; background-color: #0D0D0D; padding: 20px; text-align: center; border-radius: 10px; max-width: 600px; margin: 20px auto; border: 1px solid #FF9800;">
                <h1 style="color: #FF9800; border-bottom: 2px solid #1A1A1A; padding-bottom: 10px;">Welcome to FPMS!</h1>
                <p style="color: #FFFFFF; font-size: 16px; line-height: 1.5;">Thank you for registering. Please verify your email address to activate your account:</p>
                <div style="margin: 30px 0;">
                    <a href="${verificationUrl}" style="background-color: #FF9800; color: #000000; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
                        Verify Email Address
                    </a>
                </div>
                <p style="color: #FFFFFF; font-size: 12px; margin-top: 20px;">The link will expire in 24 hours.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Verification email sent to ${user.email}`);
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw new Error('Could not send verification email. Check nodemailer setup or App Password.');
    }
}


async function sendPasswordResetEmail(user) {
    const token = crypto.randomBytes(20).toString('hex');
    
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiration

    await user.save();

    // Use environment variable for base URL or default to localhost
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/api/reset-password/${token}`;

    const mailOptions = {
        to: user.email,
        from: `Password Reset <${transporter.options.auth.user}>`,
        subject: 'Password Reset Request',
        html: `
            <div style="font-family: Arial, sans-serif; background-color: #0D0D0D; padding: 20px; text-align: center; border-radius: 10px; max-width: 600px; margin: 20px auto; border: 1px solid #FF9800;">
                <h1 style="color: #FF9800; border-bottom: 2px solid #1A1A1A; padding-bottom: 10px;">Password Reset</h1>
                <p style="color: #FFFFFF; font-size: 16px; line-height: 1.5;">You requested a password reset. Click the link below to set a new password:</p>
                <div style="margin: 30px 0;">
                    <a href="${resetUrl}" style="background-color: #FF9800; color: #000000; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
                        Set New Password
                    </a>
                </div>
                <p style="color: #FFFFFF; font-size: 12px; margin-top: 20px;">This link will expire in 1 hour.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent to ${user.email}`);
    } catch (error) {
        console.error('Error sending reset email:', error);
        throw new Error('Could not send password reset email.');
    }
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };