const express = require("express");
const {
  register,
  login,
  logout,
  updatePassword,
  resetPassword,
  logInStatus,
  verifyOtp,
  verifyResetPassword,
  resendOtp,
  getUser,
  deleteUsers,
} = require("../controllers/userAuthController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/getuser", protect, getUser);
router.get("/loginstatus", logInStatus);
// router.patch("/updateuser", protect, updateUser);
router.patch("/updatepassword", protect, updatePassword);
router.post("/verifyotp", verifyOtp);
router.post("/reset-password", resetPassword);
router.post("/verify-reset-password", verifyResetPassword);
router.post("/resendotp", resendOtp);
router.delete("/deleteAllUsers", deleteUsers);
// router.get("/getallusers", getAllUsers);

module.exports = router;
