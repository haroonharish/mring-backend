const router = require("express").Router();
const upload = require("../middleware/upload");
const auth = require("../middleware/authMiddleware");
const { uploadCustomers, getCustomerReports, getAgentsSummary, sendCustomerMessage,
  uploadCustomerMessages, getAgentWeeklyLocations, getAgentCustomers, getExcelUploadHistory, deleteUpload, generateBatchReport,getAttendance } = require("../controllers/adminController");

router.post("/upload-customers", auth(["ADMIN", "EXECUTIVE"]), upload.single("file"), uploadCustomers);
router.get("/customer-reports", auth(["ADMIN", "EXECUTIVE"]), getCustomerReports);
router.get("/agent-summary",auth(["ADMIN", "EXECUTIVE"]), getAgentsSummary);
router.get("/agent/:agentCustomId/Customers",auth(["ADMIN", "EXECUTIVE"]), getAgentCustomers);
router.get("/upload-history", auth(["ADMIN", "EXECUTIVE"]), getExcelUploadHistory);
router.get("/report/batch/:uploadId", auth(["ADMIN", "EXECUTIVE"]), generateBatchReport);
router.delete("/excel-delete/:uploadId", auth(["ADMIN", "EXECUTIVE"]), deleteUpload);
router.get("/get-attendance", auth(["ADMIN", "EXECUTIVE"]), getAttendance);
router.get("/getWeeklyLocations", auth(["ADMIN", "EXECUTIVE"]), getAgentWeeklyLocations);
router.post("/send-message",auth(["ADMIN", "EXECUTIVE"]), sendCustomerMessage);
router.post("/upload-messages", auth(["ADMIN", "EXECUTIVE"]), uploadCustomerMessages);
module.exports = router;
