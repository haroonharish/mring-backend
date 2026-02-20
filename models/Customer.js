const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  customId: {
    type: String,
    required: true,
    unique: true
  },
  customerName: { type: String, required: true },
  address: String,
  phone: String,
  branch: String,
  accountNo: String,
  bankName: String,
  scheme: String,
  dueDate: Date,
  balance: Number,
  totalFund: Number,
  lastPaid: Number,
  isNPA: Boolean,
  assignedAgentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: { type: String, enum: ["PENDING", "VISITED"], default: "PENDING" },
  visitDate: Date,
  customerStatus: { type: String, enum: ["NEXT_WEEK", "NEXT_MONTH", "WILL_NOT_GIVE"] },
  updateFrom: { type: String, enum: ["FIELD", "WHATSAPP", "CALL"] },
  proofFile: { type: [String], default: [] },
  uploadBatchId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "ExcelUpload"
},
  createdAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model("Customer", customerSchema);

