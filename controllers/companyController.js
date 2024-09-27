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
    res.status(400);
    throw new Error("All fields are required");
  }

  console.log("Cookies: ", req.cookies);


  //  Verify that the company (user) has signed up
  const registeredCompany = await User.findOne({ email: companyEmail });

  if (!registeredCompany) {
    res.status(400);
    throw new Error("Company must sign up first before setting up a profile");
  }

  // Check if company name or email already exists in the database
  const existingCompany = await OrganizationProfile.findOne({ companyName });
  const existingEmail = await OrganizationProfile.findOne({ companyEmail });
  const existingPhone = await OrganizationProfile.findOne({ companyPhoneNumber });
  const existingCac = await OrganizationProfile.findOne({ cacNumber });

  if (existingCompany) {
    res.status(400);
    throw new Error("Company already exist");
  }

  if (existingPhone) {
    res.status(400);
    throw new Error("Company Number already exist");
  }
  if (existingCac) {
    res.status(400);
    throw new Error("Company CAC Number already exist");
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
      const newCompanyProfile = new OrganizationProfile({
        companyName,
        cacNumber,
        companyPhoneNumber,
        companyEmail,
        state,
        CAC_status: verificationStatus,
        companyAddress,
      });

      await newCompanyProfile.save();

      res.status(200).json({
        message: "Company Profile Set Successful",
        data: newCompanyProfile,
      });
    } else {
      res.status(400);
      throw new Error("CAC Number is invalid");
    }
  } catch (error) {
    console.error("Error during CAC verification: ", error.message);
    res.status(500);
    throw new Error(error.response?.data || error?.message);
    // res.status(500).json({
    //   message: "Verification failed",
    //   error: error.response?.data || error.message,
    // });
  }
});

const sendMemberInvite = expressAsyncHandler(async (req, res) => {
  try {
    const { employees } = req.body; // Expecting an array of employee objects [{ name, phoneNumber, userRole }, ...]
    const { _id: companyId, role } = req.user;

    if (role !== "company") {
      res.status(401);
      throw new Error(
        "Users are not allowed to add members, except a Company."
      );
    }

    // Check if company exists
    const company = await User.findById(companyId);
    if (!company) {
      res.status(404);
      throw new Error("Company not found");
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

      // Generate invite link
      const inviteLink = `http://localhost:3000/signup/employee/accept-invite?inviteToken=${inviteToken}`;

      // Prepare SMS message
      const message = `Hello ${name}, you've been invited to join the company. Click this link to join: ${inviteLink}`;

      try {
        // Send SMS invite using Twilio
        const smsResponse = await sendTwilioSMS({
          to: `${phoneNumber}`, // Phone number in international format
          message,
        });

        // Add successful invite to the response array
        invites.push({
          name,
          phoneNumber,
          inviteLink,
          status: smsResponse.status,
        });
      } catch (smsError) {
        // Capture failed invites
        failedInvites.push({ name, phoneNumber, error: smsError.message });
      }
    }

    // Final response
    if (failedInvites.length === 0) {
      res.status(200).json({
        message: "All invites sent successfully",
        invites,
      });
    } else {
      res.status(207).json({
        message: "Some invites failed",
        invites,
        failedInvites,
      });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to send invites", error: error.message });
  }
});

// Function to send SMS using Twilio API
const sendTwilioSMS = async ({ to, message }) => {
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
    res.status(403);
    throw new Error("Only companies can view their employees.");
  }

  // Find all employees under the company
  const employees = await Employee.find({ company: companyId }).select('-password -confirmPassword')
   

  if (!employees || employees.length === 0) {
    return res.status(404);
    throw new Error("No employees found.");
  }

  res.status(200).json(employees);
});

// get a single employee under a company
const getEmployeeUnderCompany = expressAsyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { _id: companyId, role } = req.user;

  if (role !== "company") {
    res.status(403);
    throw new Error("Only companies can view their employees.");
  }

  // Find the employee and ensure they belong to the company
  const employee = await EmployeeGuarantor.findOne({
    employee: employeeId,
    company: companyId,
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
  setUpOrganizationProfile,
  sendMemberInvite,
  getEmployeesUnderCompany,
  getEmployeeUnderCompany,
};
