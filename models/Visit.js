const mongoose = require("mongoose");

const visitSchema = new mongoose.Schema({
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
  visitDate: { type: Date, required: true },
  customerStatus: { type: String, enum: ["NEXT_WEEK", "NEXT_MONTH", "WILL_NOT_GIVE"], required: true },
  remark: { type: String },
  updateFrom: { type: String, enum: ["FIELD", "WHATSAPP", "CALL"], required: true },
  proofFile: { type: String, required: true }, // path to uploaded file
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Visit", visitSchema);
