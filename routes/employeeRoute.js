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
employeeRoute.post(
  "/employee-create-profile",
  upload.fields([
    { name: "resume", maxCount: 1 },
    { name: "passportPhoto", maxCount: 1 },
    { name: "utilityBill", maxCount: 1 },
  ]),
  protect,
  setUpEmployeeProfile
);

employeeRoute.post(
  "/employee-create-guarantor-profile",
  uploadGuarantor.fields([
    { name: "guarantor_1_passportPhoto", maxCount: 1 },
    { name: "guarantor_2_passportPhoto", maxCount: 1 },
  ]),
  protect,
  setUpEmployeeGuarantorProfile
);

employeeRoute.get("/getemployee", protect, getEmployeeDetails);

module.exports = employeeRoute;
