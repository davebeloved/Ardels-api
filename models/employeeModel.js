const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Schema = mongoose.Schema;

const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
    },
    phoneNumber: {
      type: String,
      required: [true, "Please provide a valid number"],
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
    company: { type: Schema.Types.ObjectId, ref: "User" },
    role: { type: String, default: "employee" },
    invite: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invite",
      required: true,
    },
    employeeGuarantorProfileDetails: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployeeGuarantor",
    },

    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

employeeSchema.pre("save", async function (next) {
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

const Employee = mongoose.model("Employee", employeeSchema);
module.exports = Employee;
