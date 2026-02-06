const mongoose = require("mongoose");

const excelUploadSchema = new mongoose.Schema({
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true },

  totalRows: { type: Number, default: 0 },
  successCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ["SUCCESS", "PARTIAL", "FAILED"],
    default: "SUCCESS"
  },

  failedRows: [
    {
      rowData: Object,
      reason: String
    }
  ],

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ExcelUpload", excelUploadSchema);
