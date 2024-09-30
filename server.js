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

require("dotenv").config();

const app = express();

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
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001', 'https://ardels-business.vercel.app/'],
    method: ['POST', 'GET'],
    credentials: true,
  })
);

// app.use('/', (req, res)=>{
//   res.cookie('token', 'tokenvalue')
//   res.send('hello')
// })

// middlewares for authentication endpoints
app.use("/api", userRouter);

// middlewares for company endpoints
app.use("/api", companyRouter);

// employee route
app.use("/api", employeeRoute);
app.use('/test', (req,res)=>{
  res.cookie('token', 'tokenvalue')
  res.json({msg: 'hello world'})
})

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
