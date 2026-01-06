const router = require("express").Router();
const upload = require("../utils/upload");
const auth = require("../middlewares/authMiddleware");

const {
  getCustomers,
  submitVisit,
  reportVisit
} = require("../controllers/agentController");

router.get("/customers", auth(["AGENT"]), getCustomers);
router.post("/visit", auth(["AGENT"]), upload.single("proofFile"), submitVisit);
router.post("/report-visit", auth(["AGENT"]), upload.single("proofFile"), reportVisit);

module.exports = router;
