const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  cacNumber: { type: String, required: true },
  companyPhoneNumber: { type: String, required: true, unique: true },
  companyEmail: { type: String, required: true, unique: true },
  state: { type: String, required: true },
  companyAddress: { type: String, required: true },
  CAC_status: { type: String, default: "PENDING" },
  dateVerified: { type: Date, default: Date.now },
});

const OrganizationProfile = mongoose.model("CompanyProfile", companySchema);
module.exports = OrganizationProfile;
