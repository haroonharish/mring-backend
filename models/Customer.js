const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  customId: {
    type: String,
    required: true,
    unique: true
  },
loanId: {
  type: String,
  required: true,
  unique: true
},

phone: {
  type: [String],
  default: []
},

coBorrowerPhones: {
  type: [String],
  default: []
},
nextVisitDate: {
  type: Date,
  default: null
},
isActive: { type: Boolean, default: true },
  customerName: { type: String, required: true },
  permanentAddress: String,
coBorrowerAddress: String,
temporaryAddress: String,
  branch: String,
  accountNo: String,
  bankName: String,
  scheme: String,
  dueDate: Date,
  balance: { type: Number, default: 0 },
  dpd: { type: Number, default: 0 },
  arrear: { type: Number, default: 0 },
  totalFund: { type: Number, default: 0 },
  lastPaid: { type: Number, default: 0 },
  latestDPD: { type: Number, default: 0 },
  latestArrears: { type: Number, default: 0 },
  lastPaidDate: Date,
  lastPaidTotal: { type: Number, default: 0 },
  isNPA: Boolean,
  npaDate: Date,
  assignedAgentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: { type: String, enum: ["PENDING", "VISITED", "REVISIT"], default: "PENDING" },
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

