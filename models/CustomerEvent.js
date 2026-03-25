const mongoose = require("mongoose");

const customerEventSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true
  },
  loanId: String,
  customId: String,

  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  type: {
    type: String,
    enum: ["LOAN_CLOSED", "OTHER"],
    default: "OTHER"
  },

  message: {
    type: String,
    required: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  source: {
    type: String,
    enum: ["MANUAL", "EXCEL"],
    default: "MANUAL"
  },

  isRead: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("CustomerEvent", customerEventSchema);