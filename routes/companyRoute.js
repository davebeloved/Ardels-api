const express = require("express");
const {
  setUpOrganizationProfile,
  sendMemberInvite,
  getEmployeesUnderCompany,
  getEmployeeUnderCompany,
} = require("../controllers/companyController");
const { auth, protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post(
  "/create-company-profile",
  auth("company"),
  // protect,
  setUpOrganizationProfile
);

router.post("/send-invite", protect, auth("company"), sendMemberInvite);
router.get(
  "/getAllEmployees",
  protect,
  auth("company"),
  getEmployeesUnderCompany
);
router.get(
  "/getEmployee/:employeeId",
  protect,
  auth("company"),
  getEmployeeUnderCompany
);

module.exports = router;
