const validateCompanyEmail = (req, res, next) => {
  const notAllowedDomains = ["gmail.com", "yahoo.com"];

  // Assuming the email is provided in the request body
  const { email } = req.body;

  // Check if the email ends with any of the allowed domains
  if (
    email &&
    notAllowedDomains.some((domain) => email.endsWith(`@${domain}`))
  ) {
    res.status(403);
    throw new Error("Email address must be from an allowed company domain.");
  } else {
    next();
  }
};

module.exports = validateCompanyEmail;
