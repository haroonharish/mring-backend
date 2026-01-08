const router = require("express").Router();
const upload = require("../middleware/upload");
const auth = require("../middleware/authMiddleware");
const { uploadCustomers, getCustomerReports } = require("../controllers/adminController");
const { resetAgentPassword } = require("../controllers/authController");

router.post("/upload-customers", auth(["ADMIN"]), upload.single("file"), uploadCustomers);
router.get("/customer-reports", auth(["ADMIN"]), getCustomerReports);
router.post("/reset-agent-password", auth(["ADMIN"]), resetAgentPassword);

module.exports = router;
