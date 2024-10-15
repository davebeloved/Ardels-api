const bcrypt = require("bcrypt");
const UserOtp = require("../models/otpModel");
const sendEmail = require("./sendEmail");

// Send otp
const sendRegisterOtp = async (email, otp, token, res) => {
  // Create 6-digit OTP code
  // const generateOtp = Math.floor(100000 + Math.random() * 900000).toString();

  // Hashing OTP
  // const salt = await bcrypt.genSalt(10);
  // const hashedOtp = await bcrypt.hash(generateOtp, salt);

  // Set expiration time to 5 minutes
  // const expirationTimeInSeconds = 300; 5 minutes = 300 seconds
  // const expirationTimeInMillis = expirationTimeInSeconds * 1000;

  // Save to database
  // await new UserOtp({
  //   userId: _id,
  //   otp: hashedOtp,
  //   createdAt: Date.now(),
  //   expiresAt: Date.now() + expirationTimeInMillis,
  // }).save();

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
                <p>Thank you for registering with Ardels. To complete your registration process, please use the following One-Time Password (OTP):</p>
                <h2 class="otp">${otp}</h2>
                <p>Please enter this OTP within 30 seconds to verify your account. If you did not initiate this registration, please ignore this email or contact our support team immediately at <a href="mailto:support@ardels.com">support@ardels.com</a>.</p>
                <p>Thank you for choosing Ardels. We look forward to serving you!</p>
            </div>
            <div class="footer">
                <p>Best regards, <br> The Ardels Support Team</p>
                <p><a href="https://www.ardels.com">Visit our website</a></p>
            </div>
        </div>
    </body>
    </html>
  `;

  const subject = `Verify Your Account with Ardels - Your One-Time Password (OTP)`;
  const sent_from = process.env.EMAIL_USER;
  const send_to = email;

  try {
    await sendEmail(subject, message, sent_from, send_to);
    res.status(200).json({
      status: "PENDING",
      message: "Email sent to your mail successfully",
      data: {
        email,
        token,
      },
    });
  } catch (error) {
    res.status(500);
    throw new Error("Email not sent, please try again");
  }
};

module.exports = sendRegisterOtp;

{
  /* <div class="header">
<img src="https://yourdomain.com/logo.png" alt="Ardels Logo">
</div> */
}
