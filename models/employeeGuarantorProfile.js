const mongoose = require("mongoose");

const employeeGuarantorSchema = new mongoose.Schema(
  {
    // employee: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Employee", // Reference to the employee
    //   required: true,
    // },
    guarantor_1_name: { type: String, required: true },
    guarantor_1_address: { type: String, required: true },
    guarantor_1_phoneNumber: { type: String, required: true },
    guarantor_1_relationship: { type: String, required: true },
    guarantor_1_address_status: { type: String, default: "PENDING" }, // To track address verification
    guarantor_1_passportPhoto: { type: String, required: true },

    // guarantor 2
    guarantor_2_name: { type: String, required: true },
    guarantor_2_address: { type: String, required: true },
    guarantor_2_phoneNumber: { type: String, required: true },
    guarantor_2_relationship: { type: String, required: true },
    guarantor_2_address_status: { type: String, default: "PENDING" }, // To track address verification
    guarantor_2_passportPhoto: { type: String, required: true },
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
    employeeProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployeeProfile",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const EmployeeGuarantor = mongoose.model(
  "EmployeeGuarantor",
  employeeGuarantorSchema
);
module.exports = EmployeeGuarantor;
