const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const employeeRatingSchema = new Schema(
  {
    inviteId: {
      type: Schema.Types.ObjectId,
      ref: "Invite",
      required: true,
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: "User", // Assuming User is the company schema
      required: true,
    },
    comment: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    removedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmployeeRating", employeeRatingSchema);
