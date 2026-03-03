const router = require("express").Router();
const upload = require("../middleware/upload");
const auth = require("../middleware/authMiddleware");
const { uploadCustomers, getCustomerReports, getAgentsSummary, getAgentCustomers, getExcelUploadHistory, generateBatchReport } = require("../controllers/adminController");

router.post("/upload-customers", auth(["ADMIN"]), upload.single("file"), uploadCustomers);
router.get("/customer-reports", auth(["ADMIN"]), getCustomerReports);
router.get("/agent-summary",auth(["ADMIN"]), getAgentsSummary);
router.get("/agent/:agentCustomId/Customers",auth(["ADMIN"]), getAgentCustomers);
router.get("/upload-history", auth(["ADMIN"]), getExcelUploadHistory);
router.get("/report/batch/:uploadId", auth(["ADMIN"]), generateBatchReport);
router.delete("/excel-upload/:uploadId", auth(["ADMIN"]), deleteUpload);
module.exports = router;
