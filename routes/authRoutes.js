// routes/authRoutes.js
const express = require("express");
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/admin/agent/register",authMiddleware(["ADMIN"]), authController.register);
router.post("/login", authController.login);
router.post("/reset-agent-password", authMiddleware(["ADMIN"]), authControllerresetAgentPassword);
router.post("/change-password", authMiddleware(["AGENT", "ADMIN"]), authController.changePassword);
router.post("/admin/agent/delete",authMiddleware(["ADMIN"]), authController.deleteAgent);
router.post("/admin/agent/restore",authMiddleware(["ADMIN"]), authController.restoreAgent);
module.exports = router;
