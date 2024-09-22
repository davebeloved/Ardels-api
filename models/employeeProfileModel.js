const mongoose = require("mongoose");

const employeeProfileSchema = new mongoose.Schema(
  {
    // employee: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Employee", // Reference to the employee
    //   required: true,
    // },
    name: { type: String, required: true },
    NIN: { type: String, required: true },
    NIN_status: { type: String, default: "PENDING" }, // To track NIN verification
    dateOfBirth: { type: String, required: true },
    address: { type: String, required: true },
    address_status: { type: String, default: "PENDING" }, // To track address verification
    stateOfOrigin: { type: String, required: true },
    resume: { type: String, required: true },
    utilityBill: { type: String, required: true },
    passportPhoto: { type: String, required: true },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const EmployeeProfile = mongoose.model(
  "EmployeeProfile",
  employeeProfileSchema
);
module.exports = EmployeeProfile;