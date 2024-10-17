const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Schema = mongoose.Schema;

const employeeGuarantorSchema = new mongoose.Schema({
  // employee: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: "Employee", // Reference to the employee
  //   required: true,
  // },
  guarantor_1_firstName: { type: String, required: true },
  guarantor_1_lastName: { type: String, required: true },
  guarantor_1_address: { type: String, required: true },
  guarantor_1_address_status: {
    type: Object,
  },
  guarantor_1_lga: { type: String, required: true },
  guarantor_1_city: { type: String, required: true },
  guarantor_1_dob: { type: String, required: true },
  guarantor_1_state: { type: String, required: true },
  guarantor_1_landmark: { type: String, required: true },
  guarantor_1_address_details: { type: Object },
  guarantor_1_phoneNumber: { type: String, required: true },
  guarantor_1_relationship: { type: String, required: true },
  guarantor_1_address_status: { type: String, default: "PENDING" },
  guarantor_1_passportPhoto: { type: String, required: true },

  // guarantor 2
  guarantor_2_firstName: { type: String, required: true },
  guarantor_2_lastName: { type: String, required: true },
  guarantor_2_address: { type: String, required: true },
  guarantor_2_address_status: {
    type: Object,
  },
  guarantor_2_address_details: { type: Object },
  guarantor_2_lga: { type: String, required: true },
  guarantor_2_city: { type: String, required: true },
  guarantor_2_dob: { type: String, required: true },
  guarantor_2_state: { type: String, required: true },
  guarantor_2_landmark: { type: String, required: true },
  guarantor_2_phoneNumber: { type: String, required: true },
  guarantor_2_relationship: { type: String, required: true },
  guarantor_2_address_status: { type: String, default: "PENDING" }, // To track address verification
  guarantor_2_passportPhoto: { type: String, required: true },
});

const employeeProfileSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  NIN: { type: String, required: true },
  NIN_status: { type: String, default: "PENDING" },
  dateOfBirth: { type: String, required: true },
  address: { type: String, required: true },
  address_status: {
    type: Object,
  },
  address_details: { type: Object },
  stateOfOrigin: { type: String, required: true },
  resume: { type: String, required: true },
  utilityBill: { type: String, required: true },
  passportPhoto: { type: String, required: true },
  phone: { type: String, required: true },
  lga: { type: String, required: true },
  city: { type: String, required: true },
  landmark: { type: String, required: true },
});

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
    employeeProfile: employeeProfileSchema,
    employeeGuarantorProfileDetails: employeeGuarantorSchema,
    // employeeGuarantorProfileDetails: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "EmployeeGuarantor",
    // },

    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Employee = mongoose.model("Employee", employeeSchema);
module.exports = Employee;
