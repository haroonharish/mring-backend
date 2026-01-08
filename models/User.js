const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  customId: { type: String, unique: true },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["AGENT", "ADMIN"],
    default: "AGENT"
  },
  fullName: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },

  mustChangePassword: {
    type: Boolean,
    default: false
  }
}, { timestamps: true
});

module.exports = mongoose.model("User", userSchema);
