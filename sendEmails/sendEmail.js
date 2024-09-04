const nodemailer = require("nodemailer");

const sendEmail = async (subject, message, sent_from, send_to, reply_to) => {
  // email transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: 587,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const options = {
    from: sent_from,
    to: send_to,
    replyTo: reply_to,
    subject: subject,
    html: message,
  };

  transporter.sendMail(options, (err, info) => {
    if (err) {
      console.log(err.message);
    } else {
      console.log(info);
    }
  });
};

module.exports = sendEmail;
