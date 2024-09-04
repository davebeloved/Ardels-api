const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  userId: {
    type: String,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
  },
  expiresAt: {
    type: Date,
  },
});

const UserOtp = mongoose.model("UserOtp", otpSchema);
module.exports = UserOtp;
