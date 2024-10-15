const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Schema = mongoose.Schema;

const companyProfileSchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  cacNumber: { type: String, required: true },
  companyPhoneNumber: { type: String, required: true, unique: true },
  companyEmail: { type: String, required: true, unique: true },
  state: { type: String, required: true },
  companyAddress: { type: String, required: true },
  CAC_status: { type: String, default: "PENDING" },
  dateVerified: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Please provide a valid email"],
      unique: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ], // Email validation with regex
    },

    password: {
      type: String,
      required: [true, "Please provide a password"],
    },
    confirmPassword: {
      type: String,
      required: [true, "Please provide a password"],
    },
    companyProfile: companyProfileSchema,

    verified: {
      type: Boolean,
    },
    otp: {
      type: String, // Store the OTP for verification
    },
    otpExpiresAt: {
      type: Date, // Store the expiry time for the OTP
    },
    employees: [{ type: Schema.Types.ObjectId, ref: "Employee" }],
    createdAt: { type: Date, default: Date.now },
    role: { type: String, default: "company" },

    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// userSchema.pre("save", async function (next) {
//   // you can modify other info about the user without modifying the password
//   if (!this.isModified("password") && !this.isModified("confirmPassword")) {
//     return next();
//   }

//   // hashing the password before saving to database
//   const salt = await bcrypt.genSalt(10);
//   const hashPassword = await bcrypt.hash(this.password, salt);
//   this.password = hashPassword;
//   const hashConfirmedPassword = await bcrypt.hash(this.confirmPassword, salt);
//   this.confirmPassword = hashConfirmedPassword;
//   next();
// });

const User = mongoose.model("User", userSchema);
module.exports = User;
