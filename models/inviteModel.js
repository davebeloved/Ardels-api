const mongoose = require("mongoose");

const inviteSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, //
  name: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  role: { type: String, required: true },
  inviteToken: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  sentAt: { type: Date, default: Date.now },
});

const Invite = mongoose.model("Invite", inviteSchema);
module.exports = Invite;
