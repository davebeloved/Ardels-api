const { default: axios } = require("axios");
const expressAsyncHandler = require("express-async-handler");
const OrganizationProfile = require("../models/companyProfileModel");
const User = require("../models/userModel");
const Invite = require("../models/inviteModel");
const https = require("follow-redirects").https;

const twilio = require("twilio");

const jwt = require("jsonwebtoken");
const Employee = require("../models/employeeModel");
const EmployeeProfile = require("../models/employeeProfileModel");
const EmployeeGuarantor = require("../models/employeeGuarantorProfile");
const employeeRatingSchema = require("../models/employeeRatingSchema");
const Notification = require("../models/notificationModel");
require("dotenv").config();

// Configure Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

const setUpOrganizationProfile = expressAsyncHandler(async (req, res) => {
  const {
    companyName,
    cacNumber,
    companyPhoneNumber,
    companyEmail,
    state,
    companyAddress,
  } = req.body;

  if (
    !companyName ||
    !cacNumber ||
    !companyPhoneNumber ||
    !companyEmail ||
    !state ||
    !companyAddress
  ) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  // const { _id: companyId } = req.user;
  // console.log("Cookies: ", req.cookies);
  // Fetch registration data from session
  // const registrationData = req.session.registrationData;

  // if (!registrationData || registrationData.step !== 2) {
  //   res.status(400);
  //   throw new Error("OTP not verified or step out of order");
  // }
  // Get the JWT from cookies or headers
  const token = req.cookies.token;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: "No token found, authorization denied",
    });
  }

  // Decode the JWT to get the user's registration data
  let decodedUser;
  try {
    decodedUser = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid token",
    });
  }

  const { email, password, confirmPassword } = decodedUser;

  // Check if company name already exists
  const existingCompany = await User.findOne({
    "companyProfile.companyName": companyName,
  });
  if (existingCompany) {
    return res.status(400).json({
      success: false,
      message: "Company name already exists",
    });
  }

  // Check if company email already exists
  const existingCompanyEmail = await User.findOne({
    "companyProfile.companyEmail": email,
  });

  if (existingCompanyEmail) {
    return res.status(400).json({
      success: false,
      message: "Company Email already exists",
    });
  }

  // Check if company phone number already exists
  const existingPhone = await User.findOne({
    "companyProfile.companyPhoneNumber": companyPhoneNumber,
  });
  if (existingPhone) {
    return res.status(400).json({
      success: false,
      message: "Company Phone already exists",
    });
  }

  // Check if CAC number already exists
  const existingCac = await User.findOne({
    "companyProfile.cacNumber": cacNumber,
  });
  if (existingCac) {
    return res.status(400).json({
      success: false,
      message: "Company CAC already exists",
    });
  }
  const options = {
    method: "POST",
    url: "https://api.verified.africa/sfx-verify/v3/id-service/",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      userid: process.env.USER_ID,
      apiKey: process.env.API_CAC_TOKEN,
    },
    data: {
      searchParameter: cacNumber,
      verificationType: "NG-CAC-PREMIUM-VERIFICATION",
    },
  };

  try {
    const response = await axios.request(options);
    // verificationStatus:
    // transactionStatus: 'SUCCESSFUL',
    console.log(response?.data?.response?.summary);
    console.log(response?.data?.response?.status);
    const { verificationStatus, transactionStatus } = response?.data;

    if (
      verificationStatus === "VERIFIED" &&
      transactionStatus === "SUCCESSFUL"
    ) {
      // Save to MongoDB
      const newUser = new User({
        email,
        password,
        confirmPassword,
        verified: true,
        companyProfile: {
          companyName,
          cacNumber,
          companyPhoneNumber,
          companyEmail: email,
          companyAddress,
          state,
          CAC_status: verificationStatus,
        },
      });

      await newUser.save();

      // Clear session data after successful registration
      // await User.findByIdAndUpdate(companyId, {
      //   companyProfile: newCompanyProfile._id,
      // });
      if (newUser) {
        const { _id, email, role, companyProfile, createdAt, updatedAt } =
          newUser;

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
        res.status(200).json({
          success: true,
          message: "Company completed Registration Successful",
          data: {
            _id,
            email,
            role,
            companyProfile,
            createdAt,
            updatedAt,
          },
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "CAC number is invalid",
      });
    }
  } catch (error) {
    console.error("Error during CAC verification: ", error.message);
    return res.status(400).json({
      success: false,
      message: error?.response?.data || error?.message,
    });
    // res.status(500).json({
    //   message: "Verification failed",
    //   error: error.response?.data || error.message,
    // });
  }
});

// update company details
const updateCompanyProfile = expressAsyncHandler(async (req, res) => {
  // Find the company user using the logged-in user's ID
  const companyUser = await User.findById(req.user._id);
  if (!companyUser) {
    return res.status(404).json({
      success: false,
      message: "user not found",
    });
  }

  if (!companyUser.companyProfile) {
    return res.status(404).json({
      success: false,
      message: "Company profile not found",
    });
  }

  // Update the fields with request data or keep the original values
  companyUser.companyProfile.companyPhoneNumber =
    req.body.companyPhoneNumber ||
    companyUser.companyProfile.companyPhoneNumber;
  companyUser.companyProfile.state =
    req.body.state || companyUser.companyProfile.state;
  companyUser.companyProfile.companyAddress =
    req.body.companyAddress || companyUser.companyProfile.companyAddress;
  companyUser.companyProfile.companyName =
    req.body.companyName || companyUser.companyProfile.companyName;

  // Save the updated user (which includes the embedded company profile)
  const updatedCompanyUser = await companyUser.save();

  // Respond with the updated company profile data
  res.status(200).json({
    success: true,
    message: "Company Profile updated successfully",
    data: {
      _id: updatedCompanyUser._id,
      companyEmail: updatedCompanyUser.companyProfile.companyEmail,
      companyName: updatedCompanyUser.companyProfile.companyName,
      cacNumber: updatedCompanyUser.companyProfile.cacNumber,
      companyAddress: updatedCompanyUser.companyProfile.companyAddress,
      companyPhoneNumber: updatedCompanyUser.companyProfile.companyPhoneNumber,
      state: updatedCompanyUser.companyProfile.state,
    },
  });
});

const getCompanyProfile = expressAsyncHandler(async (req, res) => {
  // Assuming `req.user` contains the authenticated user after verifying the JWT token
  const { _id } = req.user;

  // Find the organization profile based on the user's email or other identifier
  const organizationProfile = await User.findOne({
    _id,
  }).populate("companyProfile");

  if (!organizationProfile) {
    return res.status(404).json({
      success: false,
      message: "Company Profile not found",
    });
  }

  // Return the organization details
  res.status(200).json({
    success: true,
    message: "Company profile retrieved successfully",
    data: organizationProfile,
  });
});

// invite member
const sendMemberInvite = expressAsyncHandler(async (req, res) => {
  try {
    const { employees } = req.body; // Expecting an array of employee objects [{ name, phoneNumber, userRole }, ...]
    const { _id: companyId, role } = req.user;

    if (role !== "company") {
      return res.status(401).json({
        success: false,
        message: "Users are not allowed to add members except a Company",
      });
    }

    // Check if company exists
    const company = await User.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const invites = []; // To store invite details for response
    const failedInvites = []; // To store any failed invites

    // Loop through the array of employees
    for (const employee of employees) {
      const { name, phoneNumber, userRole } = employee;

      // Generate invite token
      const inviteToken = jwt.sign(
        { companyId, name, phoneNumber, userRole },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Generate invite link
      const inviteLink = `http://localhost:3000/auth/${inviteToken}`;

      // Prepare SMS message

      try {
        // Send SMS invite using Twilio
        const smsResponse = await sendTwilioSMS({
          to: `${phoneNumber}`, // Phone number in international format
          inviteToken,
        });

        // Store the invite in the database
        const invite = new Invite({
          company: companyId,
          name,
          phoneNumber,
          role: userRole,
          inviteToken,
          status: "pending",
        });
        await invite.save();

        // Add successful invite to the response array
        invites.push({
          name,
          phoneNumber,
          inviteLink,
          status: smsResponse.status,
        });
      } catch (smsError) {
        // Capture failed invites
        console.log(smsError);

        failedInvites.push({ name, phoneNumber, error: smsError.message });
      }
    }

    // Final response
    if (failedInvites.length === 0) {
      res.status(201).json({
        success: true,
        message: "All invites sent successfully",
        data: {
          invites,
        },
      });
    } else {
      res.status(207).json({
        success: false,
        message: "Some invites failed",
        invites,
        failedInvites,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to send invites",
      message: error.message,
    });
  }
});

// resend invite link
const resendMemberInvite = expressAsyncHandler(async (req, res) => {
  try {
    const { invitedId } = req.body; // Expecting employeeId from the request body
    const { _id: companyId, role } = req.user;

    if (role !== "company") {
      return res.status(401).json({
        success: false,
        message: "Only Company can resend member invites",
      });
    }

    // Find the employee invite by ID (assuming Invite schema stores employee invites)
    const invite = await Invite.findOne({
      _id: invitedId,
      company: companyId,
      status: "pending",
    });

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: "Invite not found or already accepted",
      });
    }

    // Re-generate the invite token (can either reuse the same or generate a new one)
    const inviteToken = jwt.sign(
      {
        companyId,
        name: invite.name,
        phoneNumber: invite.phoneNumber,
        role: invite.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    invite.inviteToken = inviteToken; // Update invite token
    await invite.save();

    // Generate new invite link
    const inviteLink = `http://localhost:3000/auth/${inviteToken}`;

    try {
      // Send SMS invite using Twilio
      const smsResponse = await sendTwilioSMS({
        to: `${invite.phoneNumber}`,
        inviteToken,
      });

      res.status(200).json({
        success: true,
        message: "Invite resent successfully",
        data: {
          name: invite.name,
          phoneNumber: invite.phoneNumber,
          inviteLink,
          status: smsResponse.status,
        },
      });
    } catch (smsError) {
      res.status(500).json({
        success: false,
        message: "Failed to resend the invite",
        message: smsError.message,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to resend invite",
      message: error.message,
    });
  }
});

// Function to send SMS using Twilio API
const sendTwilioSMS = async ({ to, inviteToken }) => {
  const message = `
  <!DOCTYPE html>
  <html lang="en">
  <body>
      <div class="container">
          <div class="content">
              <h2>Hello ${name}</h2>
              <p>you've been invited to join the company. Click the link below to join:</p>
          </div>
          <div class="footer">
              <p><a href="http://localhost:3000/auth/${inviteToken}">Join now</a></p>
          </div>
      </div>
  </body>
  </html>
`;
  try {
    const response = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER, // Replace with your Twilio number
      to: to,
    });
    return response;
  } catch (error) {
    throw new Error(error.message);
  }
};

// get all employee under a company
const getEmployeesUnderCompany = expressAsyncHandler(async (req, res) => {
  const { _id: companyId, role } = req.user;

  if (role !== "company") {
    return res.status(400).json({
      success: false,
      message: "Only company can view their employees",
    });
  }

  // Find all employees under the company
  const employees = await Invite.find({ company: companyId })
    .populate("employee")
    .select("-password -confirmPassword");

  if (!employees || employees.length === 0) {
    return res
      .status(201)
      .json({ success: true, message: "You have no employee", data: [] });
  }

  // Destructure required fields from employees data
  const structuredEmployees = employees.map((invite) => {
    const {
      _id: inviteId,
      company,
      name,
      phoneNumber,
      role,
      status,
      sentAt,
      employee: {
        _id: employeeId,
        name: employeeName,
        phoneNumber: employeePhone,
        role: employeeRole,
        employeeProfile: {
          firstName,
          lastName,
          NIN,
          NIN_status,
          dateOfBirth,
          address,
          address_status,
          address_details,
          stateOfOrigin,
          resume,
          utilityBill,
          passportPhoto,
        },
        employeeGuarantorProfileDetails,
      },
    } = invite;

    return {
      inviteId,
      company,
      name,
      phoneNumber,
      role,
      status,
      sentAt,
      employee: {
        employeeId,
        employeeName,
        employeePhone,
        employeeRole,
        employeeProfile: {
          firstName,
          lastName,
          NIN,
          NIN_status,
          dateOfBirth,
          address,
          address_status,
          address_details,
          stateOfOrigin,
          resume,
          utilityBill,
          passportPhoto,
        },
        employeeGuarantorProfileDetails,
      },
    };
  });

  // Return structured data
  res.status(201).json({
    success: true,
    message: "Employees fetched",
    data: structuredEmployees,
  });
});

const getEmployeesUnderCompany1 = expressAsyncHandler(async (req, res) => {
  const { _id: companyId, role } = req.user;

  if (role !== "company") {
    res.status(403);
    throw new Error("Only companies can view their employees.");
  }

  // Find all employees under the company
  const employees = await Invite.find({ company: companyId })
    .populate("employee")
    .select("-passsword -confirmPassword");
  // const employees = await Invite.find({ company: companyId }).populate({
  //   path: "employeeProfile",
  //   populate: {
  //     path: "employee",
  //     select: "-password -confirmPassword",
  //     populate: {
  //       path: "employeeGuarantorProfileDetails",
  //     },
  //   },
  // });

  if (!employees || employees.length === 0) {
    // res.status(404);
    // throw new Error("No employees found.");
    return res.status(200).json([]); // Return an empty array with a 200 status
  }

  res.status(200).json(employees);
});

// get a single employee under a company
const getEmployeeUnderCompany = expressAsyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { _id: companyId, role: companyRole } = req.user;

  if (companyRole !== "company") {
    return res.status(403).json({
      success: false,
      message: "Only Company can view their employees",
    });
  }

  // Find the employee and ensure they belong to the company
  const employee = await Invite.findOne({
    company: companyId,
  })
    .populate("employee")
    .select("-password -confirmPassword");

  if (!employee) {
    return res.status(404).json({
      success: false,
      message: "Employee not found or does not belong to your company",
    });
  }

  // Destructure required fields from employee data
  const {
    _id: inviteId,
    company,
    name,
    phoneNumber,
    role,
    status,
    sentAt,
    employee: {
      _id: employeeid,
      name: employeeName,
      phoneNumber: employeePhone,
      role: employeeRole,
      employeeProfile: {
        firstName,
        lastName,
        NIN,
        NIN_status,
        dateOfBirth,
        address,
        address_status,
        address_details,
        stateOfOrigin,
        resume,
        utilityBill,
        passportPhoto,
      },
      employeeGuarantorProfileDetails,
    },
  } = employee;

  const structuredEmployee = {
    inviteId,
    company,
    name,
    phoneNumber,
    role,
    status,
    sentAt,
    employee: {
      employeeid,
      employeeName,
      employeePhone,
      employeeRole,
      employeeProfile: {
        firstName,
        lastName,
        NIN,
        NIN_status,
        dateOfBirth,
        address,
        address_status,
        address_details,
        stateOfOrigin,
        resume,
        utilityBill,
        passportPhoto,
      },
      employeeGuarantorProfileDetails,
    },
  };

  // Return structured data
  res.status(200).json({
    success: true,
    message: "Employee fetched",
    data: structuredEmployee,
  });
});

const getEmployeeUnderCompany1 = expressAsyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { _id: companyId, role } = req.user;

  if (role !== "company") {
    res.status(403);
    throw new Error("Only companies can view their employees.");
  }

  // Find the employee and ensure they belong to the company
  const employee = await Invite.findOne({
    company: companyId,
  })
    .populate("employee")
    .select("-password -confirmPassword");
  // const employee = await Invite.findOne({
  //   company: companyId,
  // }).populate({
  //   path: "employeeProfile",
  //   match: { employee: employeeId }, // Match the employeeId in the employeeProfile model
  //   populate: {
  //     path: "employee",
  //     select: "-password -confirmPassword",
  //     populate: {
  //       path: "employeeGuarantorProfileDetails",
  //     },
  //   },
  // });

  if (!employee) {
    res.status(404);
    throw new Error("Employee not found or does not belong to your company.");
  }

  res.status(200).json(employee);
});

// remove employee
const removeEmployee = expressAsyncHandler(async (req, res) => {
  const { invitedId, comment, rating } = req.body;

  // Find the company from the logged-in user's session
  const company = await User.findById(req.user._id);

  if (!company) {
    return res
      .status(404)
      .json({ success: false, message: "Company not found" });
  }

  // Find the employee by ID
  const employee = await Invite.findById(invitedId);

  if (!employee) {
    return res
      .status(404)
      .json({ success: false, message: "Employee not found" });
  }

  // Check if the employee belongs to the company
  if (employee?.company?.toString() !== company?._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Employee does not belong to your company",
    });
  }

  // Remove employee from company (set company to null)
  employee.company = null;
  await employee.save();

  // Record the comment and rating in EmployeeRating schema
  const employeeRating = new employeeRatingSchema({
    inviteId: invitedId,
    company: company._id,
    comment,
    rating,
  });

  await employeeRating.save();

  res.status(201).json({
    success: true,
    message: "Employee removed and rating submitted successfully",
    data: employeeRating,
  });
});

const getAllAvailableEmployees = expressAsyncHandler(async (req, res) => {
  try {
    const ratings = await employeeRatingSchema.find().populate({
      path: "inviteId",
      match: { status: "accepted" },
      populate: {
        path: "employee",
        select: "-password -confirmPassword",
      },
    });

    const filteredRatings = ratings.filter(
      (rating) => rating.inviteId !== null
    );

    if (!filteredRatings.length) {
      return res
        .status(404)
        .json({ success: false, message: "No accepted invites found" });
    }

    res.status(201).json({
      success: true,
      message: "All available employees",
      data: filteredRatings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const getSingleAvailableEmployee = expressAsyncHandler(async (req, res) => {
  const { availableEmployeeId } = req.params;

  try {
    // Find the specific rating based on the availableEmployeeId
    const rating = await employeeRatingSchema
      .findOne({ _id: availableEmployeeId })
      .populate({
        path: "inviteId",
        match: { status: "accepted" },
        populate: {
          path: "employee",
          select: "-password -confirmPassword", // Exclude password fields
        },
      });

    // If the inviteId is not populated (null), or inviteId does not exist, return an error
    if (!rating || !rating.inviteId) {
      return res
        .status(404)
        .json({
          success: false,
          message: "No accepted invites found for this employee",
        });
    }

    // Return the rating if inviteId exists and is accepted
    res
      .status(201)
      .json({
        success: true,
        message: "Available Single Employee",
        data: rating,
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = {
  setUpOrganizationProfile,
  sendMemberInvite,
  getEmployeesUnderCompany,
  getEmployeeUnderCompany,
  getCompanyProfile,
  resendMemberInvite,
  updateCompanyProfile,
  removeEmployee,
  getAllAvailableEmployees,
  getSingleAvailableEmployee,
};
