const express = require("express");
const {
  signupWithInvite,
  setUpEmployeeProfile,
  setUpEmployeeGuarantorProfile,
  employeeLogin,
  getEmployeeDetails,
} = require("../controllers/employeeController");
const upload = require("../utils/uploadFiles");
const { protect, auth } = require("../middlewares/authMiddleware");
const uploadGuarantor = require("../utils/uploadGuarantorsFiles");

const employeeRoute = express.Router();

employeeRoute.post("/employee-signup", signupWithInvite);
employeeRoute.post("/employee-login", employeeLogin);
employeeRoute.post("/employee-create-profile", setUpEmployeeProfile);

employeeRoute.post(
  "/employee-create-guarantor-profile",
  setUpEmployeeGuarantorProfile
);

employeeRoute.get("/getemployee", protect, getEmployeeDetails);

module.exports = employeeRoute;
