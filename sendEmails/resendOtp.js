const UserOtp = require("../models/otpModel");
const sendEmail = require("./sendEmail");
const bcrypt = require("bcrypt");

const otpResend = async (_id, email, res) => {
  try {
    // Generate a 4-digit OTP code
    const generateOtp = Math.floor(100000 + Math.random() * 9000).toString();

    // Hash the OTP
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(generateOtp, salt);

    // Set OTP expiration time to 2 minutes (120 seconds)
    const expirationTimeInSeconds = 90;
    const expirationTimeInMillis = expirationTimeInSeconds * 1000;

    // Save the OTP to the database
    await new UserOtp({
      userId: _id,
      otp: hashedOtp,
      createdAt: Date.now(),
      expiresAt: Date.now() + expirationTimeInMillis,
    }).save();

    // Prepare the email content
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
                  <p>We have received a request to resend the OTP for your Ardels account. Please use the following OTP to proceed:</p>
                  <h2 class="otp">OTP Code: <b>${generateOtp}</b></h2>
                  <p>This OTP is valid for 30 seconds. If you did not request this OTP, please ignore this email or contact our support team immediately at <a href="mailto:support@ardels.com">support@ardels.com</a>.</p>
                  <p>Thank you for choosing Ardels. We look forward to serving you!</p>
              </div>
              <div class="footer">
                  <p>Best regards, <br>The Ardels Support Team</p>
              </div>
          </div>
      </body>
      </html>
    `;

    // Email subject and sender/recipient details
    const subject = `Resend OTP`;
    const sent_from = process.env.EMAIL_USER;
    const send_to = email;

    // Send the email
    await sendEmail(subject, message, sent_from, send_to);

    // Respond with success
    res.status(200).json({
      status: "PENDING",
      message: "Email sent to your mail successfully",
      data: {
        userId: _id,
        email,
      },
    });
  } catch (error) {
    res.status(500);
    throw new Error("Email not sent, please try again");
  }
};

module.exports = otpResend;
