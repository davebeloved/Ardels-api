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
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
    // throw new Error("All fields are required");
  }

  // Email validation using regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address",
    });
    // throw new Error("Please provide a valid email address");
  }

  // checking if the password is more than 6 character
  if (password.length && confirmPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Your password must be at least 8 characteers",
    });
    // throw new Error("Your password must be at least 8 characteers");
  }

  // Checking if the password contains at least one uppercase letter,
  // one lowercase letter, one digit, and one special symbol
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      success: false,
      message:
        "Your password must contain at least 8 characters with at least one uppercase letter, one lowercase letter, one digit, and one special symbol",
    });
    // throw new Error(
    //   "Your password must contain at least 8 characters with at least one uppercase letter, one lowercase letter, one digit, and one special symbol"
    // );
  }
  // checking if the password and confirmPassword matches
  if (password.length != confirmPassword.length) {
    return res.status(400).json({
      success: false,
      message: "Your password does not match",
    });
    // throw new Error("Your password does not match");
  }

  // checking the database if user already exists
  const emailExist = await User.findOne({ email });
  if (emailExist) {
    return res.status(400).json({
      success: false,
      message: "Email Already exist",
    });
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
  const otp = generateOtp();
  const otpExpiration = Date.now() + 10 * 60 * 1000; // Set expiration time for OTP
  const payload = {
    email,
    password: hashedPassword,
    otp,
    otpExpiration,
    confirmPassword: hashedPassword, // Storing confirmPassword for later verification
    step: 1,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "30m" });
  // sending HTTP-only cookie for refreshToken
  res.cookie("token", token, {
    // path: "/",
    // httpOnly: true,
    maxAge: 1800000,
    sameSite: "none",
    secure: true,
    // domain: ".ardels.vercel.app",
  });

  try {
    await sendRegisterOtp(email, otp, token, res);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error,
    });
  }
});

// Login User
const login = expressAsync(async (req, res) => {
  const { email, password } = req.body;

  // checking if the fields are empty
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
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
    return res.status(400).json({
      success: false,
      message: "User does not exist, please signup",
    });
  }

  // Check if the user is verified
  if (!user.verified) {
    return res.status(403).json({
      success: false,
      message: "Your account is not verified, please verify before logging in",
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
    res.status(201).json({
      success: true,
      message: "Login sucessfully",
      data: {
        _id,
        email,
        role,
        employees,
        token: accessToken,
      },
    });
  } else {
    return res.status(400).json({
      success: false,
      message: "Invalid email or password",
    });
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
  return res
    .status(200)
    .json({ success: true, message: "You have successfully logout" });
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
        success: true,
        message: "user fetched",
        data: {
          user,
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "user not found",
      });
    }
  } catch (error) {
    // console.log(error);
    return res.status(400).json({
      success: false,
      message: error,
    });
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
    return res.status(404).json({
      success: false,
      message: "user not found please login",
    });
  } else {
    if (!oldPassword || !password) {
      return res.status(400).json({
        success: false,
        message: "Oldpassword and new password are required",
      });
    }

    const passwordIsCorrect = await bcrypt.compare(oldPassword, user.password);

    if (user && passwordIsCorrect) {
      user.password = password;
      await user.save();

      return res
        .status(201)
        .json({ success: true, message: "Password updated successfully " });
    } else {
      return res.status(400).json({
        success: false,
        message: "Old password is incorrect",
      });
    }
  }
});

// reset Password
const resetPassword = expressAsync(async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email field is required",
      });
    }
    // Email validation using regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
      // throw new Error("Please provide a valid email address");
    }
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User does not exist",
      });
    } else {
      await sendResetPasswordOtp(user._id, user.email, res);
    }
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error,
    });
  }
});

const verifyResetPassword = expressAsync(async (req, res) => {
  try {
    const { userId, password, confirmPassword } = req.body;

    // Validation: Check if required fields are empty
    if (!userId || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Empty fields are not allowed",
      });
    }

    // Find regular user by userId
    const user = await User.findById(userId);
    let userToUpdate = user;

    // If regular user not found, find invited user instead
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
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
    return res.status(201).json({
      success: true,
      status: "VERIFIED",
      message: "Your password has been reset successfully",
      data: {
        _id,
        email,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
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

// Step 2: Verify OTP using JWT
const verifyOtp = expressAsync(async (req, res) => {
  const { otp } = req.body; // Expecting both the token and the OTP from the request body

  try {
    // Extract token from headers
    const token = req.cookies.token; // Assumes Bearer token format

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided. Please register first.",
      });
    }
    // Verify and decode the JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const otpExpirationTimestamp = new Date(decoded.otpExpiration).getTime();

    const currentTime = Date.now();
    // console.log("Current Time:", currentTime); // Debugging current time
    // console.log("OTP Expiration Time:", otpExpirationTimestamp); // Debugging stored expiration

    // Check if OTP has expired
    if (currentTime > otpExpirationTimestamp) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired, please request a new OTP",
      });
    }

    // Check if the submitted OTP matches the one stored in the JWT
    if (otp !== decoded.otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // OTP verified, update step in token payload
    // OTP verified, remove the `exp` field from the decoded payload before re-signing
    const { exp, iat, ...newPayload } = decoded; // Remove the exp and iat properties
    newPayload.step = 2; // Update step to indicate OTP verification
    const newToken = jwt.sign(newPayload, process.env.JWT_SECRET, {
      expiresIn: "30m",
    });

    // Sending updated token in the response
    res.cookie("token", newToken, {
      maxAge: 1800000, // Cookie expiry time in milliseconds (e.g., 1 hour)
      secure: true,
      sameSite: "none",
    });

    // OTP verified, you can add additional logic if needed
    res.status(201).json({
      success: true,
      message: "OTP verified, proceed to profile creation",
    }); // Return the token for the next step
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please register again",
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
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
  // Extract token from headers
  const token = req.cookies.token;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: "No token provided, please register first",
    });
  }

  // Verify the token and extract email
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const { email } = decoded; // Extracting email from JWT payload

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email not found, please register first",
    });
  }

  // Generate a new OTP
  const otp = generateOtp();
  const otpExpiration = Date.now() + 10 * 60 * 1000; // Set new OTP expiration time to 5 minutes from now
  // Create a new JWT with the new OTP and expiration time

  // Update OTP and expiration in the JWT payload
  // OTP verified, remove the `exp` field from the decoded payload before re-signing
  const { exp, iat, ...newPayload } = decoded; // Remove the exp and iat properties
  newPayload.step = 2; // Update step to indicate OTP verification
  const newToken = jwt.sign(newPayload, process.env.JWT_SECRET, {
    expiresIn: "30m",
  });

  // Sending updated token in the response
  res.cookie("token", newToken, {
    maxAge: 1800000, // Cookie expiry time in milliseconds (e.g., 1 hour)
    secure: true,
    sameSite: "none",
  });

  try {
    await otpResend(email, otp, res); // Send the new OTP to the email
  } catch (error) {
    console.log(error);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token, please register again",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to resend OTP, please try again",
    });
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
