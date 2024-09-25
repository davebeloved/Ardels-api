const nodemailer = require("nodemailer");

const sendEmail = async (subject, message, sent_from, send_to, reply_to) => {
  // email transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    service: 'gmail',

    // port: 587,
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    logger: true, // enable logging
    debug: true, // show debug output
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

// module.exports = sendEmail;
// const nodemailer = require("nodemailer");

// const sendEmail = async (subject, message, sent_from, send_to, reply_to) => {
//   // email transporter
//   const transporter = nodemailer.createTransport({
//     host: process.env.EMAIL_HOST,
//     // port: 587,
//     port: 465,
//     secure: true,
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS,
//     },
//     tls: {
//       rejectUnauthorized: false,
//     },
//   });

//   const options = {
//     from: sent_from,
//     to: send_to,
//     replyTo: reply_to,
//     subject: subject,
//     html: message,
//   };

//   try {
//     const info = await transporter.sendMail(options);
//     console.log("Email sent successfully:", info);
//     console.error("Error occurred:", err);
//   }
// };

module.exports = sendEmail;
