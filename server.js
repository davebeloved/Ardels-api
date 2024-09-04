const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const connectDB = require("./config/connectDB");
const { default: mongoose } = require("mongoose");
const errorHandler = require("./middlewares/errorMiddleware");
const userRouter = require("./routes/authRoute");

require("dotenv").config();

const app = express();

// middlewares
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

const allowedOrigin = (origin, callback) => {
  callback(null, true);
};

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

app.use("/api", userRouter);

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
