const express = require("express");
const {
  setUpOrganizationProfile,
  sendMemberInvite,
  getEmployeesUnderCompany,
  getEmployeeUnderCompany,
  getCompanyProfile,
  resendMemberInvite,
  updateCompanyProfile,
} = require("../controllers/companyController");
const { auth, protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post(
  "/create-company-profile",
  protect,
  auth("company"),
  setUpOrganizationProfile
);

router.post("/send-invite", protect, auth("company"), sendMemberInvite);
router.post("/resend-invite", protect, auth("company"), resendMemberInvite);
router.patch(
  "/update-company-profile",
  protect,
  auth("company"),
  updateCompanyProfile
);
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
router.get("/getCompany", protect, auth("company"), getCompanyProfile);

module.exports = router;
