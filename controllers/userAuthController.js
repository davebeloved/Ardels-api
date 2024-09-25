const expressAsync = require("express-async-handler");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const UserOtp = require("../models/otpModel");
const User = require("../models/userModel");
const sendRegisterOtp = require("../sendEmails/sendRegisterOtp");
const sendResetPasswordOtp = require("../sendEmails/sendResetPasswordOtp");
const otpResend = require("../sendEmails/resendOtp");

// Register user
const register = expressAsync(async (req, res) => {
  const { email, password, confirmPassword } = req.body;
  // checking if the fields are empty
  if (!email || !password || !confirmPassword) {
    res.status(400);
    throw new Error("All fields are required");
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
  const user = await User.create({
    email,
    password,
    confirmPassword,
    verified: false,
  });

  const { _id } = user;

  const refreshToken = jwt.sign(
    {
      _id,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
  const accessToken = jwt.sign(
    {
      _id,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "1m" }
  );

  // sending HTTP-only cookie
  res.cookie("refreshToken", refreshToken, {
    path: "/",
    httpOnly: true,
    maxAge: 86400000, // 1 day
    sameSite: "None",
    secure: true,
    // domain: ".ardels.vercel.app",
  });
  res.cookie("accessToken", accessToken, {
    path: "/",
    httpOnly: true,
    maxAge: 86400000, // 1 day
    sameSite: "None",
    secure: true,
    // domain: ".ardels.vercel.app",
  });
  try {
    await sendRegisterOtp(user._id, user.email, res, accessToken);
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
    res.status(403); // Forbidden status
    throw new Error(
      "Your account is not verified, please verify before logging in"
    );
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
      httpOnly: true,
      maxAge: 86400000, // 1 day
      sameSite: "None",
      secure: true,
      // domain: ".ardels.vercel.app",
    });

    // sending HTTP-only cookie for accessToken
    res.cookie("accessToken", accessToken, {
      // path: "/",
      httpOnly: true,
      maxAge: 3600000, // 1 hour
      sameSite: "None",
      secure: true,
      // domain: ".ardels.vercel.app",
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
    const user = await User.findById(req.user._id);
    if (user) {
      const { _id, email, mobile, access } = user;
      res.status(200).json({
        _id,
        email,
        access,
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
const verifyOtp = expressAsync(async (req, res) => {
  try {
    const { userId, otp } = req.body;

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
      console.log("Expires At (Millis):", expiresAtMillis);
      console.log("Current Time (Millis):", currentTimeMillis);

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
      const { _id, email } = user;
      res.status(200).json({
        status: "VERIFIED",
        message: "Your email has been verified successfully",
        _id,
        email,
        // token: accessToken,
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// resend OTP
const resendOtp = expressAsync(async (req, res) => {
  try {
    const { userId, email } = req.body;

    if (!userId || !email) {
      res.status(400);
      throw new Error("Empty field  are not allowed");
    }
    const user = await User.findOne({ email });
    if (!user) {
      res.status(400);
      throw new Error("User does not exist");
    } else {
      await UserOtp.deleteMany({ userId });
      // await sendOtp(user._id, user.email, user.fullName, user.mobile, res);
      await otpResend(user._id, user.email, res);
    }
  } catch (error) {
    res.status(500);
    throw new Error(error);
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
