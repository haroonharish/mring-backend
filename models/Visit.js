const mongoose = require("mongoose");

const visitSchema = new mongoose.Schema({
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  customId: {
    type: String, // C01
    required: true
  },
  dispoLocationstatus: { type: String, enum: ["Own residence at Good Residential area", "Own residence at other area", "Rented residence at Good residential area", "Rented residence at other area"] }, 
  visitDate: { type: Date, required: true },
  actionDoneDate: { type: Date, required: true },
  customerStatus: { type: String, enum: ["CB/Re visit","CLPD","PTP","CB","LM","DL","OS","RTP","ISSUE","NC","NR","WN","NC"], required: true },
  remark: { type: String },
  updateFrom: { type: String, enum: ["FIELD", "WHATSAPP", "CALL"], required: true },
  proofFile: { type: [String], required: true, default: [] },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Visit", visitSchema);
