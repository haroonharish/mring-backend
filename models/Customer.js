const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  address: String,
  phone: String,
  loanId: String,
  assignedAgentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: { type: String, enum: ["PENDING", "VISITED"], default: "PENDING" },
  visitDate: Date,
  customerStatus: { type: String, enum: ["NEXT_WEEK", "NEXT_MONTH", "WILL_NOT_GIVE"] },
  updateFrom: { type: String, enum: ["FIELD", "WHATSAPP", "CALL"] },
  proofFile: String, // path to uploaded file
  createdAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model("Customer", customerSchema);

