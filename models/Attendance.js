const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  date: {
    type: String, // "2026-03-10"
    required: true
  },

  checkInTime: {
    type: Date
  },

  checkOutTime: {
    type: Date
  },

  checkInLocation: {
    lat: Number,
    lng: Number
  },

  checkOutLocation: {
    lat: Number,
    lng: Number
  },

  totalWorkHours: {
    type: Number
  },

}, { timestamps: true });

attendanceSchema.index(
  { agentId: 1, date: 1 },
  { unique: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);