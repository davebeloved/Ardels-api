const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const connectDB = require("./config/connectDB");
const { default: mongoose } = require("mongoose");
const errorHandler = require("./middlewares/errorMiddleware");
const userRouter = require("./routes/authRoute");
const companyRouter = require("./routes/companyRoute");
const employeeRoute = require("./routes/employeeRoute");
const axios = require("axios");
const session = require("express-session");
const MongoStore = require("connect-mongo");

require("dotenv").config();

const app = express();
app.use(express.urlencoded({ extended: true }));

// middlewares
app.use(express.json());
app.use(cookieParser());
// app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// const allowedOrigin = [
//   "http://localhost:5173"
// ]

const allowedOrigin = (origin, callback) => {
  callback(null, true);
};

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:3001",
      "https://ardels-business.vercel.app",
    ],
    method: ["POST", "GET"],
    credentials: true,
  })
);

// app.use('/', (req, res)=>{
//   res.cookie('token', 'tokenvalue')
//   res.send('hello')
// })

// Session Configuration
// app.use(
//   session({
//     secret: process.env.JWT_SECRET,
//     resave: false,
//     saveUninitialized: true,
//     cookie: {
//       // sameSite: "None",
//       maxAge: 1000 * 60 * 15,
//       secure: true,
//       httpOnly: true,
//     },
//     store: MongoStore.create({
//       mongoUrl: process.env.MONGODB_URL,
//       ttl: 14 * 24 * 60 * 60,
//     }),
//   })
// );

app.set("trust proxy", 1); // trust first proxy for Heroku, Nginx, etc.

// middlewares for authentication endpoints
app.use("/api", userRouter);

// middlewares for company endpoints
app.use("/api", companyRouter);

// employee route
app.use("/api", employeeRoute);
app.use("/test", (req, res) => {
  res.cookie("token", "tokenvalue");
  res.json({ msg: "hello world" });
});

app.use(errorHandler);

const port = process.env.PORT || 5000;

// connecting to mongodb
const start = async () => {
  try {
    await connectDB(process.env.MONGODB_URL);
    console.log("connection successfully");
    app.listen(port, console.log(`server listening to port ${port}`));
    // server.listen(
  } catch (error) {
    console.log(error);
  }
};

start();
