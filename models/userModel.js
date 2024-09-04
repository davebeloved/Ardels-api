const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Please provide a valid email"],
      unique: true,
    },

    password: {
      type: String,
      required: [true, "Please provide a password"],
    },
    confirmPassword: {
      type: String,
      required: [true, "Please provide a password"],
    },

    verified: {
      type: Boolean,
    },

    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  // you can modify other info about the user without modifying the password
  if (!this.isModified("password") && !this.isModified("confirmPassword")) {
    return next();
  }

  // hashing the password before saving to database
  const salt = await bcrypt.genSalt(10);
  const hashPassword = await bcrypt.hash(this.password, salt);
  this.password = hashPassword;
  const hashConfirmedPassword = await bcrypt.hash(this.confirmPassword, salt);
  this.confirmPassword = hashConfirmedPassword;
  next();
});

const User = mongoose.model("User", userSchema);
module.exports = User;
