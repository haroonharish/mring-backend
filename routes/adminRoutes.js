const router = require("express").Router();
const upload = require("../utils/upload");
const auth = require("../middlewares/authMiddleware");
const { uploadCustomers, getReports } = require("../controllers/adminController");

router.post("/upload-customers", auth(["ADMIN"]), upload.single("file"), uploadCustomers);
router.get("/customer-reports", auth(["ADMIN"]), getReports);

module.exports = router;
