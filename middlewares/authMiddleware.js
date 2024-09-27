const jwt = require("jsonwebtoken");
const expressAsync = require("express-async-handler");
const User = require("../models/userModel");

const protects = expressAsync(async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith("Bearer")) {
      const token = authHeader.split(" ")[1];
      if (!token) {
        res.status(401);
        throw new Error("Not Authorized, Please login");
      }

      // Verify token
      try {
        const verified = jwt.verify(token, process.env.ACCESS_TOKEN);
        // Get user data by id
        const user = await User.findById(verified.id).select(
          "-password -confirmPassword"
        );
        console.log(user);
        console.log(verified);
        if (!user) {
          res.status(401);
          throw new Error("No user found");
        }
        req.user = user;
        next();
      } catch (err) {
        if (err.name === "TokenExpiredError") {
          res.status(401);
          throw new Error(err.message);
          // throw new Error('Token has expired');
        } else {
          res.status(401);
          // throw new Error('Invalid token');
          throw new Error(err.message);
        }
      }
    } else {
      res.status(401);
      throw new Error("Not Authorized, Please login");
    }
  } catch (error) {
    res.status(401);
    throw new Error(error.message);
  }
});

const protect = expressAsync(async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;
    if (!accessToken) {
      // Call renewToken and await its result
      const renewed = await renewToken(req, res);
      if (renewed) {
        next();
      } else {
        // Handle case where token renewal failed
        return res.status(401).json({ msg: "Token has expired, please Login" });
      }
    } else {
      // Token exists, verify it
      jwt.verify(
        accessToken,
        process.env.ACCESS_TOKEN_SECRET,
        (err, decoded) => {
          if (err) {
            // Handle verification error
            console.log("Verification error:", err);
            return res.status(401).json({ msg: "Failed to verify token" });
          } else {
            // Token is valid, set user ID in request and proceed
            req.user = decoded && decoded;
            next();
          }
        }
      );
    }
  } catch (error) {
    console.log(error.message);
    return res.status(401).json({ msg: error.message });
  }
});

const renewToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return false; // No refreshToken, return false
    } else {
      const decoded = await jwt.verify(refreshToken, process.env.JWT_SECRET);
      if (!decoded || !decoded._id) {
        return false; // Verification failed or no user id found
      }
      const { _id } = decoded;
      const accessToken = jwt.sign({ _id }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        maxAge: "1h", // 1 minute
        secure: false,
      });
      // Set req.user before proceeding
      req.user = decoded;
      return true; // Token renewed successfully
    }
  } catch (error) {
    console.log("Error renewing token:", error.message);
    return false; // Error occurred during token renewal, return false
  }
};

const auth = (role) => (req, res, next) => {
  try {
    // Check for the access token in cookies
    const token = req.cookies.accessToken;
    console.log('accc', accessToken);
    
    if (!token) {
      return res.status(401).json({ message: "Not authorized, token missing" });
    }

    // Verify the token
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        console.log("Token verification error:", err);
        return res.status(401).json({ message: "Token is not valid" });
      }

      // Check if the user's role matches the required role
      if (decoded.role !== role) {
        return res
          .status(403)
          .json({ message: "Access denied. Insufficient privileges" });
      }

      // Attach the decoded user to the request object
      req.user = decoded;
      console.log("decoded", decoded);

      // Proceed to the next middleware or route handler
      next();
    });
  } catch (error) {
    console.log("Auth middleware error:", error.message);
    return res.status(401).json({ message: "Authorization error" });
  }
};
module.exports = { protect, auth };

// try {
//   const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN);
//   console.log('11', decoded);
//   if (!decoded || !decoded._id) {
//     res.status(401);
//     throw new Error('Verification failed or no user id found');
//     return;
//   }else {
//     if(decoded){
//       req.user = decoded._id;
//      console.log('User ID:', req.user);
//       next();
//     }
//   }
// } catch (err) {
//   if (err.name === 'TokenExpiredError') {
//     // Token has expired, attempt to renew it
//     const renewed =  renewToken(req, res);
//     if (renewed) {
//       return next();
//     } else {
