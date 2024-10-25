const bcrypt = require("bcrypt");
const UserOtp = require("../models/otpModel");
const sendEmail = require("./sendEmail");

// Send OTP for password reset
const sendResetPasswordOtp = async (_id, email, res) => {
  // Create 4-digit OTP code
  const generateOtp = Math.floor(100000 + Math.random() * 9000).toString();

  // Hashing OTP
  const salt = await bcrypt.genSalt(10);
  const hashedOtp = await bcrypt.hash(generateOtp, salt);

  // Set expiration time to 120 seconds
  const expirationTimeInSeconds = 30;
  const expirationTimeInMillis = expirationTimeInSeconds * 1000;

  // Save to database
  await new UserOtp({
    userId: _id,
    otp: hashedOtp,
    createdAt: Date.now(),
    expiresAt: Date.now() + expirationTimeInMillis,
  }).save();

  // Email content
  const message = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: Arial, sans-serif;
                color: #333;
                margin: 0;
                padding: 0;
                background-color: #f9f9f9;
            }
            .container {
                max-width: 600px;
                margin: 20px auto;
                padding: 20px;
                background: #ffffff;
                border-radius: 8px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 20px;
            }
            .header img {
                max-width: 150px;
            }
            .content {
                margin: 20px 0;
            }
            .otp {
                font-size: 24px;
                font-weight: bold;
                color: #2a9d8f;
            }
            .footer {
                margin-top: 20px;
                font-size: 14px;
                color: #666;
                text-align: center;
            }
            .footer a {
                color: #2a9d8f;
                text-decoration: none;
            }
            .footer a:hover {
                text-decoration: underline;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="content">
                <h2>Hello there,</h2>
                <p>You recently requested to reset your password for your Ardels account. To proceed with the password reset process, please use the following One-Time Password (OTP) reset code:</p>
                <h2 class="otp">${generateOtp}</h2>
                <p>Please enter this OTP within 30 seconds to reset your password. If you did not initiate this request, please ignore this email or contact our support team immediately at <a href="mailto:support@ardels.com">support@ardels.com</a>.</p>
                <p>Thank you for using Ardels. If you have any questions or need further assistance, please don't hesitate to reach out.</p>
            </div>
            <div class="footer">
                <p>Best regards, <br>The Accountsgoal Support Team</p>
                <p><a href="https://www.ardels.com">Visit our website</a></p>
            </div>
        </div>
    </body>
    </html>
  `;

  const subject = `Reset Your Password`;
  const sent_from = process.env.EMAIL_USER;
  const send_to = email;

  try {
    await sendEmail(subject, message, sent_from, send_to);
    res.status(200).json({
      success: true,
      status: "PENDING",
      message: "Email sent to your mail successfully",
      data: {
        userId: _id,
        email,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Email not sent, please try again",
    });
  }
};

module.exports = sendResetPasswordOtp;
