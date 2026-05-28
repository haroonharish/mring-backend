// routes/authRoutes.js
const express = require("express");
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/admin/agent/register",authMiddleware(["ADMIN", "EXECUTIVE"]), authController.register);
router.post("/login", authController.login);
router.post("/reset-agent-password", authMiddleware(["ADMIN"]), authController.resetAgentPassword);
router.post("/change-password", authMiddleware(["AGENT", "ADMIN"]), authController.changePassword);
router.post("/admin/agent/delete",authMiddleware(["ADMIN"]), authController.deleteAgent);
router.post("/admin/agent/restore",authMiddleware(["ADMIN"]), authController.restoreAgent);
router.post("/checkin", authMiddleware(["AGENT"]), authController.checkIn);
router.post("/checkout", authMiddleware(["AGENT"]), authController.checkOut);
router.get("/attendance/status", authMiddleware(["AGENT"]), authController.getAttendanceStatus);
router.get("/notifications", authMiddleware(["AGENT"]), authController.getAgentNotifications);
router.put("/notifications/:id", authMiddleware(["AGENT"]), authController.markNotificationRead);
router.post("/admin/executive/register", authMiddleware(["ADMIN"]), authController.registerExecutive);
router.get("/admin/executives", authMiddleware(["ADMIN"]), authController.getExecutives);
router.get("/executive/my-agents", authMiddleware(["EXECUTIVE"]), authController.getMyAgents);
router.get("/admin/agents", authMiddleware(["ADMIN", "EXECUTIVE"]), authController.getAgentsList);
module.exports = router;
