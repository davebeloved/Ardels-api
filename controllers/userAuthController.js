const expressAsync = require("express-async-handler");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const UserOtp = require("../models/otpModel");
const User = require("../models/userModel");
const Invite = require("../models/inviteModel");
const sendRegisterOtp = require("../sendEmails/sendRegisterOtp");
const sendResetPasswordOtp = require("../sendEmails/sendResetPasswordOtp");
const otpResend = require("../sendEmails/resendOtp");
const crypto = require("crypto");

const isProduction = process.env.NODE_PROD === "production";

// Helper function to generate a random OTP
const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString(); // Generate a 6-digit OTP
};

// Register user
const register = expressAsync(async (req, res) => {
  const { email, password, confirmPassword } = req.body;
  // checking if the fields are empty
  if (!email || !password || !confirmPassword) {
    res.status(400);
    throw new Error("All fields are required");
  }

  // Email validation using regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400);
    throw new Error("Please provide a valid email address");
  }

  // checking if the password is more than 6 character
  if (password.length && confirmPassword.length < 8) {
    res.status(400);
    throw new Error("Your password must be at least 8 characteers");
  }

  // Checking if the password contains at least one uppercase letter,
  // one lowercase letter, one digit, and one special symbol
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    res.status(400);
    throw new Error(
      "Your password must contain at least 8 characters with at least one uppercase letter, one lowercase letter, one digit, and one special symbol"
    );
  }
  // checking if the password and confirmPassword matches
  if (password.length != confirmPassword.length) {
    res.status(400);
    throw new Error("Your password does not match");
  }

  // checking the database if user already exists
  const emailExist = await User.findOne({ email });
  if (emailExist) {
    res.status(400);
    throw new Error("Email already exist");
  }

  // create new user
  // const user = await User.create({
  //   email,
  //   password,
  //   confirmPassword,
  //   verified: false,
  // });

  // const { _id, role } = user;

  // const refreshToken = jwt.sign(
  //   {
  //     _id,
  //     role,
  //   },
  //   process.env.JWT_SECRET,
  //   { expiresIn: "1d" }
  // );
  // const accessToken = jwt.sign(
  //   {
  //     _id,
  //     role,
  //   },
  //   process.env.ACCESS_TOKEN_SECRET,
  //   { expiresIn: "1h" }
  // );

  // sending HTTP-only cookie
  // res.cookie("refreshToken", refreshToken, {
  // path: "/",
  // httpOnly: true,
  // maxAge: 86400000, Cookie expiry time in milliseconds (e.g., 1 day)
  //   sameSite: "None",
  //   secure: true,
  // });
  // res.cookie("accessToken", accessToken, {
  // path: "/",
  // httpOnly: true,
  //   maxAge: 3600000, Cookie expiry time in milliseconds (e.g., 1 day)
  //   sameSite: "None",
  //   secure: true,
  // });

  // Hash the password and temporarily store email, password, and confirmPassword in the session
  const hashedPassword = await bcrypt.hash(password, 10);
  req.session.registrationData = {
    email,
    password: hashedPassword,
    confirmPassword: hashedPassword, // Storing confirmPassword for later verification
    step: 1,
  };

  // Generate dynamic OTP and store it in session for verification later
  const otp = generateOtp();
  const otpExpiration = Date.now() + 5 * 60 * 1000; // Set OTP expiration time to 5 minutes from now
  req.session.otp = otp;
  req.session.otpExpiration = otpExpiration; // Store expiration time in session

  try {
    await sendRegisterOtp(email, otp, res);
  } catch (error) {
    res.status(400);
  }
});

// Login User
const login = expressAsync(async (req, res) => {
  const { email, password } = req.body;

  // checking if the fields are empty
  if (!email || !password) {
    res.status(400);
    throw new Error("All fields are required");
  }

  // finding the user (either employee or company) from the database
  let user = await User.findOne({ email });
  let role = "company";

  if (!user) {
    // If not a company, check if it's an employee
    user = await Employee.findOne({ email });
    role = "employee"; // If user is an employee
  }

  // If the user doesn't exist
  if (!user) {
    res.status(400);
    throw new Error("User does not exist, please signup");
  }

  // Check if the user is verified
  if (!user.verified) {
    return res.status(403).json({
      msg: "Your account is not verified, please verify before logging in",
      userId: user._id,
      email: user.email,
    });
  }
  // comparing the password from the user to the database
  const passwordIsCorrect = await bcrypt.compare(password, user.password);

  if (user && passwordIsCorrect) {
    const { _id, email, role, employees } = user;

    // Generate refresh and access tokens with the user role
    const refreshToken = jwt.sign(
      { _id, role }, // Add role to JWT
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    const accessToken = jwt.sign(
      { _id, role }, // Add role to JWT
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1h" }
    );

    // sending HTTP-only cookie for refreshToken
    res.cookie("refreshToken", refreshToken, {
      // path: "/",
      // httpOnly: true,
      maxAge: 86400000, // Cookie expiry time in milliseconds (e.g., 1 day)
      sameSite: "None",
      secure: true,
      // domain: ".ardels.vercel.app",
    });

    // sending HTTP-only cookie for accessToken
    res.cookie("accessToken", accessToken, {
      // path: "/",
      // httpOnly: true,
      maxAge: 3600000, // Cookie expiry time in milliseconds (e.g., 1 day)
      sameSite: "None",
      secure: true,
    });

    // Respond with the user data and accessToken
    res.status(200).json({
      _id,
      email,
      role,
      employees,
      token: accessToken,
    });
  } else {
    res.status(400);
    throw new Error("Invalid email or password");
  }
});
// const login = expressAsync(async (req, res) => {
//   const { email, password } = req.body;

//   // checking if the fields are empty
//   if (!email || !password) {
//     res.status(400);
//     throw new Error("All fields are required");
//   }

//   // finding the user from the database
//   const user = await User.findOne({ email });

//   if (!user) {
//     res.status(400);
//     throw new Error("User does not exist, please signup");
//   } else {
//     // comparing the password from the user to the database
//     const passwordIsCorrect = await bcrypt.compare(password, user.password);

//     // Generate token

//     // user.refreshToken = refreshToken;
//     // const result = await user.save();
//     // console.log((result));

//     if (user && passwordIsCorrect) {
//       const { _id, email, access } = user;

//       const refreshToken = jwt.sign(
//         {
//           _id,
//         },
//         process.env.JWT_SECRET,
//         { expiresIn: "1d" }
//       );
//       const accessToken = jwt.sign(
//         {
//           _id,
//         },
//         process.env.ACCESS_TOKEN,
//         { expiresIn: "1m" }
//       );

//       // sending HTTP-only cookie
//       res.cookie("refreshToken", refreshToken, {
//         path: "/",
//         httpOnly: true,
//         maxAge: 86400000, // Cookie expiry time in milliseconds (e.g., 1 day)
//         sameSite: "None",
//         secure: true,
//         domain: ".ardels.vercel.app",
//       });
//       res.cookie("accessToken", accessToken, {
//         path: "/",
//         httpOnly: true,
//         maxAge: 60000,
//         sameSite: "None",
//         secure: true,
//         domain: ".ardels.vercel.app/",
//       });
//       res.status(200).json({
//         _id,
//         email,
//         access,
//         token: accessToken,
//       });
//     } else {
//       res.status(400);
//       throw new Error("invalid email or password");
//     }
//   }
// });

// logout user
const logout = expressAsync(async (req, res) => {
  res.cookie("refreshToken", "", {
    // path: "/",
    httpOnly: true,
    expires: new Date(0),
    sameSite: "None",
    secure: true,
    // domain: ".ardels.vercel.app/",
  });
  res.cookie("accessToken", "", {
    // path: "/",
    httpOnly: true,
    expires: new Date(0),
    sameSite: "None",
    secure: true,
    // domain: ".ardels.vercel.app/",
  });
  return res.status(200).json({ message: "You have successfully logout" });
});

// get user data
const getUser = expressAsync(async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("companyProfile")
      .select("-password -confirmPassword");
    if (user) {
      const { _id, email, mobile, access } = user;
      res.status(200).json({
        user,
      });
    } else {
      res.status(400);
      throw new Error("User not found");
    }
  } catch (error) {
    // console.log(error);
    res.status(400);
    throw new Error(error);
  }
});

// loggedin status
const logInStatus = expressAsync(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.json(false);
  }
  const verified = jwt.verify(refreshToken, process.env.JWT_SECRET);
  if (verified) {
    return res.json(true);
  }
  return res.json(false);
});

// Update password
const updatePassword = expressAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  const { oldPassword, password } = req.body;
  if (!user) {
    res.status(404);
    throw new Error("User not found please login");
  } else {
    if (!oldPassword || !password) {
      res.status(400);
      throw new Error("Oldpassword and new password are required");
    }

    const passwordIsCorrect = await bcrypt.compare(oldPassword, user.password);

    if (user && passwordIsCorrect) {
      user.password = password;
      await user.save();

      res.status(200).json("Password updated successfully ");
    } else {
      res.status(400);
      throw new Error("Old password is incorrect");
    }
  }
});

// reset Password
const resetPassword = expressAsync(async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!email) {
      res.status(400);
      throw new Error("Empty field is required");
    }
    if (!user) {
      res.status(400);
      throw new Error("User does not exist");
    } else {
      await sendResetPasswordOtp(user._id, user.email, res);
    }
  } catch (error) {
    res.status(500);
    throw new Error(error);
  }
});

const verifyResetPassword = expressAsync(async (req, res) => {
  try {
    const { userId, password, confirmPassword } = req.body;

    // Validation: Check if required fields are empty
    if (!userId || !password || !confirmPassword) {
      res.status(400);
      throw new Error("Empty fields are not allowed");
    }

    // Find regular user by userId
    const user = await User.findById(userId);
    let userToUpdate = user;

    // If regular user not found, find invited user instead
    if (!user) {
      res.status(400);
      throw new Error("User not found");
    }

    // Update user password and verification status
    userToUpdate.password = password;
    userToUpdate.confirmPassword = confirmPassword;
    userToUpdate.verified = true;
    await userToUpdate.save();

    // Delete OTP record after successful verification
    // await UserOtp.deleteMany({ userId });

    // Prepare response data
    const { _id, email } = userToUpdate;
    res.status(200).json({
      status: "VERIFIED",
      message: "Your password has been reset successfully",
      _id,
      email,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// verify OTP
const verifyOtp1 = expressAsync(async (req, res) => {
  try {
    const { userId, otp } = req.body;
    console.log("user", req.user);

    // Validation: Check if required fields are empty
    if (!userId || !otp) {
      res.status(400);
      throw new Error("Empty fields are not allowed");
    }

    // Find regular user by userId
    const user = await User.findById(userId);

    // Find invited user by userId if regular user not found
    if (!user) {
      res.status(400);
      throw new Error("User does not exist");
    } else {
      // Verify OTP for regular user
      const userVerificationRecord = await UserOtp.findOne({ userId });
      if (!userVerificationRecord) {
        res.status(400);
        throw new Error(
          "Verification record not found. Please request OTP again."
        );
      }

      const { expiresAt, otp: hashedOtp } = userVerificationRecord;
      // Convert expiresAt to a timestamp in milliseconds
      const expiresAtMillis = new Date(expiresAt).getTime();
      const currentTimeMillis = Date.now();

      // Logging for debugging
      // console.log("Expires At (Millis):", expiresAtMillis);
      // console.log("Current Time (Millis):", currentTimeMillis);

      // Check if OTP has expired with a grace period of 5 seconds
      if (expiresAtMillis < currentTimeMillis - 5000) {
        await UserOtp.deleteMany({ userId });
        throw new Error("OTP has expired. Please request OTP again.");
      }

      // Validate OTP
      const validOtp = await bcrypt.compare(otp, hashedOtp);
      if (!validOtp) {
        res.status(400);
        throw new Error(
          "Invalid code passed. Check your inbox for the correct OTP."
        );
      }

      // Update regular user verification status
      await User.updateOne({ _id: userId }, { verified: true });
      await UserOtp.deleteMany({ userId });

      // Prepare response for regular user
      const { _id, email, role } = user;

      // Generate refresh and access tokens with the user role
      const refreshToken = jwt.sign(
        { _id, role }, // Add role to JWT
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );
      const accessToken = jwt.sign(
        { _id, role }, // Add role to JWT
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );

      // sending HTTP-only cookie for refreshToken
      res.cookie("refreshToken", refreshToken, {
        // path: "/",
        // httpOnly: true,
        maxAge: 86400000, // Cookie expiry time in milliseconds (e.g., 1 day)
        sameSite: "None",
        secure: true,
      });

      // sending HTTP-only cookie for accessToken
      res.cookie("accessToken", accessToken, {
        // path: "/",
        // httpOnly: true,
        maxAge: 3600000, // Cookie expiry time in milliseconds (e.g., 1 day)
        sameSite: "None",
        secure: true,
      });

      // console.log(refreshToken, 'refreshtoken');
      // console.log(accessToken, 'refreshtoken');

      res.status(200).json({
        status: "VERIFIED",
        message: "Your email has been verified successfully",
        _id,
        email,
        role,
        // token: accessToken,
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const verifyOtp = expressAsync(async (req, res) => {
  const { otp } = req.body;
  console.log(req.session);

  if (!req.session.registrationData) {
    res.status(400);
    throw new Error("Please complete the registration form first.");
  }

  // Check if the OTP has expired
  const currentTime = Date.now();
  if (currentTime > req.session.otpExpiration) {
    res.status(400);
    throw new Error("OTP has expired, please request a new one.");
  }

  // Check if the submitted OTP matches the one stored in the session
  if (otp !== req.session.otp) {
    res.status(400);
    throw new Error("Invalid OTP");
  }

  // OTP verified, store OTP verified status in session
  req.session.registrationData.isOtpVerified = true;
  req.session.registrationData.step = 2;

  res
    .status(200)
    .json({ message: "OTP verified, proceed to profile creation" });
});

// resend OTP
const resendOtp = expressAsync(async (req, res) => {
  // const { userId, email } = req.body;

  // if (!userId || !email) {
  //   res.status(400);
  //   throw new Error("Empty field  are not allowed");
  // }
  // const user = await User.findOne({ email });
  // if (!user) {
  //   res.status(400);
  //   throw new Error("User does not exist");
  // } else {
  //   await UserOtp.deleteMany({ userId });
  //   // await sendOtp(user._id, user.email, user.fullName, user.mobile, res);
  //   await otpResend(user._id, user.email, res);
  // }
  console.log(req.session);

  // Ensure that the user is in the registration flow and has completed the email/password step
  if (
    !req.session.registrationData ||
    req.session.registrationData.step !== 1
  ) {
    res.status(400);
    throw new Error(
      "No registration process found. Please complete the registration form first."
    );
  }

  // Generate a new OTP
  const newOtp = generateOtp();
  const newOtpExpiration = Date.now() + 5 * 60 * 1000; // Set new OTP expiration time to 5 minutes from now

  // Update the session with the new OTP and its expiration time
  req.session.otp = newOtp;
  req.session.otpExpiration = newOtpExpiration;
  try {
    await otpResend(req.session.registrationData.email, newOtp, res); // Send the new OTP to the email
  } catch (error) {
    console.log(error);

    res.status(500);
    throw new Error("Failed to resend OTP, please try again.");
  }
});

// delete all users
const deleteUsers = expressAsync(async (req, res) => {
  try {
    const user = await User.deleteMany({});
    if (!user) {
      res.status(400);
      throw new Error("User does not exist");
    } else {
      res.status(200).json({ message: "All Users has been deleted" });
    }
  } catch (error) {
    res.status(500);
    throw new Error(error);
  }
});

module.exports = {
  register,
  login,
  logout,
  getUser,
  logInStatus,
  updatePassword,
  resetPassword,
  verifyResetPassword,
  verifyOtp,
  resendOtp,
  deleteUsers,
};
