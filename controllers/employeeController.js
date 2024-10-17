const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const expressAsyncHandler = require("express-async-handler");
const Invite = require("../models/inviteModel");
const Employee = require("../models/employeeModel");
const { default: axios } = require("axios");
const EmployeeProfile = require("../models/employeeProfileModel");
const EmployeeGuarantor = require("../models/employeeGuarantorProfile");
const employeeRatingSchema = require("../models/employeeRatingSchema");

// Signup with Invite
const signupWithInvite = expressAsyncHandler(async (req, res) => {
  const { inviteToken, password, confirmPassword, phoneNumber } = req.body;

  try {
    if (!inviteToken || !phoneNumber || !password || !confirmPassword) {
      res.status(400);
      throw new Error("All fields are required");
    }
    // Verify the invite token
    const decoded = jwt.verify(inviteToken, process.env.JWT_SECRET);

    const {
      companyId,
      phoneNumber: invitedPhoneNumber,
      name,
      userRole,
    } = decoded;

    // Check if the invite exists in the database
    const invite = await Invite.findOne({
      inviteToken,
      phoneNumber: invitedPhoneNumber,
    });
    if (!invite || invite.status !== "pending") {
      res.status(400);
      throw new Error("Invalid or expired invite.");
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

    // Check if the employee already exists
    const existingUser = await Employee.findOne({ phoneNumber });
    if (existingUser) {
      res.status(400);
      throw new Error("User already exists.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const payload = {
      name: invite.name,
      phoneNumber,
      role: invite.role,
      company: companyId,
      invite: invite._id,
      password: hashedPassword,
      confirmPassword: hashedPassword,
      step: 1,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "30m",
    });
    // sending HTTP-only cookie for refreshToken
    res.cookie("token", token, {
      // path: "/",
      // httpOnly: true,
      maxAge: 1800000,
      sameSite: "none",
      secure: true,
      // domain: ".ardels.vercel.app",
    });

    res.status(201).json({
      message:
        "Employee completed first step successfully!, please move on to creating your profile",
      // employee: {
      //   id: employee._id,
      //   name: employee.name,
      //   phoneNumber,
      //   role: employee.role,
      //   company: employee.company,
      //   invite: employee.invite,
      // },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to sign up using invite." });
  }
});

// Login User
const employeeLogin = expressAsyncHandler(async (req, res) => {
  const { phoneNumber, password } = req.body;

  // checking if the fields are empty
  if (!phoneNumber || !password) {
    res.status(400);
    throw new Error("All fields are required");
  }

  // finding the user (either employee or company) from the database
  let user = await Employee.findOne({ phoneNumber });
  let role = "employee";

  // If the user doesn't exist
  if (!user) {
    res.status(400);
    throw new Error("Employee does not exist");
  }

  // comparing the password from the user to the database
  const passwordIsCorrect = await bcrypt.compare(password, user.password);

  if (user && passwordIsCorrect) {
    const { _id, phoneNumber, role, company, invite: inviteId } = user;

    // Generate refresh and access tokens with the user role
    const refreshToken = jwt.sign(
      { _id, role, phoneNumber, inviteId }, // Add role to JWT
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    const accessToken = jwt.sign(
      { _id, role, inviteId }, // Add role to JWT
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

    // Respond with the user data and accessToken
    res.status(200).json({
      _id,
      phoneNumber,
      company,
      inviteId,
      role,
      token: accessToken,
    });
  } else {
    res.status(400);
    throw new Error("Invalid email or password");
  }
});

// setup employee profile
const setUpEmployeeProfile = expressAsyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    NIN,
    dateOfBirth,
    address,
    stateOfOrigin,
    phone,
    lga,
    city,
    landmark,
    passportPhoto,
    utilityBill,
    resume,
  } = req.body;

  if (
    !firstName ||
    !lastName ||
    !NIN ||
    !dateOfBirth ||
    !address ||
    !stateOfOrigin ||
    !resume ||
    !utilityBill ||
    !passportPhoto ||
    !lga ||
    !city ||
    !phone ||
    !landmark
  ) {
    res.status(400);
    throw new Error("All fields are required");
  }

  // const { _id: employeeId, inviteId } = req.user;
  // console.log("employee", req.user);

  const token = req.cookies.token;

  if (!token) {
    res.status(401);
    throw new Error("No token found. Authorization denied");
  }

  // Decode the JWT to get the user's registration data
  let decodedUser;
  try {
    decodedUser = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    res.status(401);
    throw new Error("Invalid token");
  }

  const {
    name,
    phoneNumber,
    role,
    company: companyId,
    invite: inviteId,
    password,
    confirmPassword,
    step,
  } = decodedUser;

  // Files: resume, passportPhoto, utilityBill (handled by multer)
  // const resume = req.files.resume[0].path;
  // const passportPhoto = req.files.passportPhoto[0].path;
  // const utilityBill = req.files.utilityBill[0].path;
  //   console.log(resume);
  //   console.log(passportPhoto);
  //   console.log(utilityBill);

  // Verify NIN using an external API
  const ninOptions = {
    method: "POST",
    url: "https://api.verified.africa/sfx-verify/v3/id-service/",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      userid: process.env.USER_ID,
      apiKey: process.env.API_NIN_TOKEN,
    },
    data: {
      searchParameter: NIN,
      countryCode: "NG",
      verificationType: "V-NIN",
    },
  };

  const credentials = {
    firstName,
    lastName,
    dob: dateOfBirth,
    phone,
    verificationType: "INDIVIDUAL-ADDRESS-VERIFICATION",
    kycType: "frsc",
    callbackUrl: "https://webhook.site/71f0e4a3-84a0-405d-97e6-9d4f1530ea86",
    searchParameter: "PQR41659AA50",
    street: address,
    lga,
    city,
    state: stateOfOrigin,
    landmark,
  };

  try {
    // NIN Verification
    const ninResponse = await axios.request(ninOptions);
    const ninStatus = ninResponse?.data?.verificationStatus || "FAILED";
    // console.log(ninResponse?.data?.ninResponse?.status);
    const { verificationStatus, transactionStatus } = ninResponse?.data;

    // Address verification
    const addressResponse = await axios.post(
      "https://api.verified.africa/sfx-v4-verify/v4/id-service",
      credentials,
      {
        headers: {
          accept: "application/json",
          userid: process.env.USER_ID,
          apiKey: process.env.API_ADDRESS,
          "content-type": "application/json",
        },
      }
    );

    // console.log("what", ninResponse);
    // if (
    //   verificationStatus === "VERIFIED" &&
    //   transactionStatus === "SUCCESSFUL"
    // ) {
    // Save employee profile after verification
    const newPayload = {
      name,
      phoneNumber,
      role,
      company: companyId,
      invite: inviteId,
      password,
      confirmPassword,
      step: 2,
      employeeProfile: {
        firstName,
        lastName,
        NIN,
        NIN_status: ninResponse?.data.verificationStatus,
        dateOfBirth,
        address,
        phone,
        lga,
        city,
        landmark,
        stateOfOrigin,
        address_status: addressResponse?.data?.response?.summary,
        address_details: addressResponse?.data?.response?.address?.location,
        resume,
        passportPhoto,
        utilityBill,
      },
    };

    const token = jwt.sign(newPayload, process.env.JWT_SECRET, {
      expiresIn: "30m",
    });
    // sending HTTP-only cookie for refreshToken
    res.cookie("token", token, {
      // path: "/",
      // httpOnly: true,
      maxAge: 1800000,
      sameSite: "none",
      secure: true,
      // domain: ".ardels.vercel.app",
    });

    // await Invite.findByIdAndUpdate(inviteId, {
    //   employeeProfile: employeeProfile._id,
    // });

    res.status(201).json({
      message:
        "Employee Profile Created Successfully, proceed on adding your guarantors",
    });
  } catch (error) {
    console.error("Error during verification: ", error);
    res.status(500);
    throw new Error("Verification failed");
  }
});

const setUpEmployeeGuarantorProfile = expressAsyncHandler(async (req, res) => {
  const {
    guarantor_1_firstName,
    guarantor_1_lastName,
    guarantor_1_relationship,
    guarantor_1_phoneNumber,
    guarantor_1_city,
    guarantor_1_dob,
    guarantor_1_state,
    guarantor_1_lga,
    guarantor_1_landmark,
    guarantor_1_address,
    guarantor_1_passportPhoto,

    guarantor_2_firstName,
    guarantor_2_lastName,
    guarantor_2_relationship,
    guarantor_2_phoneNumber,
    guarantor_2_address,
    guarantor_2_city,
    guarantor_2_dob,
    guarantor_2_state,
    guarantor_2_lga,
    guarantor_2_landmark,
    guarantor_2_passportPhoto,
  } = req.body;

  const token = req.cookies.token;

  if (!token) {
    res.status(401);
    throw new Error("No token found. Authorization denied");
  }

  // Decode the JWT to get the user's registration data
  let decodedUser;
  try {
    decodedUser = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    res.status(401);
    throw new Error("Invalid token");
  }

  const {
    name,
    phoneNumber,
    role,
    company: companyId,
    invite: inviteId,
    password,
    confirmPassword,
    step,
    employeeProfile,
  } = decodedUser;

  // const {
  //   firstName,
  //   lastName,
  //   NIN,
  //   NIN_status,
  //   dateOfBirth,
  //   address,
  //   phone,
  //   lga,
  //   city,
  //   landmark,
  //   stateOfOrigin,
  //   address_status,
  //   address_details,
  //   resume,
  //   passportPhoto,
  //   utilityBill,
  // } = employeeProfile

  //   console.log(resume);
  //   console.log(passportPhoto);
  //   console.log(utilityBill);

  const guarantor1Credentials = {
    firstName: guarantor_1_firstName,
    lastName: guarantor_1_lastName,
    dob: guarantor_1_dob,
    phone: guarantor_1_phoneNumber,
    verificationType: "INDIVIDUAL-ADDRESS-VERIFICATION",
    kycType: "frsc",
    callbackUrl: "https://webhook.site/71f0e4a3-84a0-405d-97e6-9d4f1530ea86",
    searchParameter: "PQR41659AA50",
    street: guarantor_1_address,
    lga: guarantor_1_lga,
    city: guarantor_1_city,
    state: guarantor_1_state,
    landmark: guarantor_1_landmark,
  };
  const guarantor2Credentials = {
    firstName: guarantor_2_firstName,
    lastName: guarantor_2_lastName,
    dob: guarantor_2_dob,
    phone: guarantor_2_phoneNumber,
    verificationType: "INDIVIDUAL-ADDRESS-VERIFICATION",
    kycType: "frsc",
    callbackUrl: "https://webhook.site/71f0e4a3-84a0-405d-97e6-9d4f1530ea86",
    searchParameter: "PQR41659AA50",
    street: guarantor_2_address,
    lga: guarantor_2_lga,
    city: guarantor_2_city,
    state: guarantor_2_state,
    landmark: guarantor_2_landmark,
  };

  try {
    const guarantor1AddressResponse = await axios.post(
      "https://api.verified.africa/sfx-v4-verify/v4/id-service",
      guarantor1Credentials,
      {
        headers: {
          accept: "application/json",
          userid: process.env.USER_ID,
          apiKey: process.env.API_ADDRESS,
          "content-type": "application/json",
        },
      }
    );

    const guarantor2AddressResponse = await axios.post(
      "https://api.verified.africa/sfx-v4-verify/v4/id-service",
      guarantor2Credentials,
      {
        headers: {
          accept: "application/json",
          userid: process.env.USER_ID,
          apiKey: process.env.API_ADDRESS,
          "content-type": "application/json",
        },
      }
    );

    // console.log(
    //   "1",
    //   guarantor1AddressResponse?.data?.response.summary.address_check
    // );

    // Save employee profile after verification
    const employee = new Employee({
      name,
      phoneNumber,
      role,
      company: companyId,
      invite: inviteId,
      password,
      confirmPassword,
      step,
      employeeProfile,
      employeeGuarantorProfileDetails: {
        guarantor_1_firstName,
        guarantor_1_lastName,
        guarantor_1_relationship,
        guarantor_1_city,
        guarantor_1_phoneNumber,
        guarantor_1_dob,
        guarantor_1_state,
        guarantor_1_lga,
        guarantor_1_landmark,
        guarantor_1_address,
        guarantor_1_address_status:
          guarantor1AddressResponse?.data?.response?.summary?.address_check,

        // guarantor_1_address_status: {
        //   address_check:
        //     guarantor1AddressResponse?.data?.response?.summary?.address_check,
        // },
        guarantor_1_address_details:
          guarantor1AddressResponse?.data?.response?.address?.location,
        guarantor_2_firstName,
        guarantor_2_lastName,
        guarantor_2_relationship,
        guarantor_2_phoneNumber,
        guarantor_2_address,
        guarantor_2_address_status:
          guarantor2AddressResponse?.data?.response?.summary?.address_check,

        guarantor_2_address_details:
          guarantor2AddressResponse?.data?.response?.address?.location,
        guarantor_2_city,
        guarantor_2_dob,
        guarantor_2_state,
        guarantor_2_lga,
        guarantor_2_phoneNumber,
        guarantor_2_landmark,
        guarantor_1_passportPhoto,
        guarantor_2_passportPhoto,
      },
    });

    await employee.save();

    await Invite.findByIdAndUpdate(inviteId, {
      employee: employee._id,
      status: "accepted",
    });

    if (employee) {
      const {
        _id,
        name,
        phoneNumber,
        role,
        invite,
        employeeProfile,
        employeeGuarantorProfileDetails,
      } = employee;

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
        secure: true,
        sameSite: "none",
        // domain: ".ardels.vercel.app",
      });

      // sending HTTP-only cookie for accessToken
      res.cookie("accessToken", accessToken, {
        // path: "/",
        // httpOnly: true,
        maxAge: 3600000, // Cookie expiry time in milliseconds (e.g., 1 day)
        sameSite: "none",
        secure: true,
      });

      res.status(201).json({
        message: "Employee  Created Successfully",
        data: {
          _id,
          name,
          phoneNumber,
          role,
          inviteId: invite,
          employeeProfile,
          employeeGuarantorProfileDetails,
        },
      });
    }
  } catch (error) {
    console.error("Error during verification: ", error);
    res.status(500);
    throw new Error("Verification failed");
  }
});

// get a single employee under a company
const getEmployeeDetails = expressAsyncHandler(async (req, res) => {
  const { _id: employeeId } = req.user;

  // Find the employee and ensure they belong to the company
  const employee = await EmployeeGuarantor.findOne({
    employee: employeeId,
  })
    .populate("employee")
    .populate("employeeProfile")
    .select("-password -confirmPassword")
    .exec();

  if (!employee) {
    res.status(404);
    throw new Error("Employee not found or does not belong to your company.");
  }

  res.status(200).json(employee);
});

module.exports = {
  signupWithInvite,
  setUpEmployeeProfile,
  setUpEmployeeGuarantorProfile,
  employeeLogin,
  getEmployeeDetails,
};
