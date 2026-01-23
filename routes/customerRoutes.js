// routes/customerRoutes.js
const express = require("express");
const customerController = require("../controllers/customerController");
const authMiddleware = require("../middleware/authMiddleware"); // JWT Auth Middleware
const router = express.Router();

router.get("/", authMiddleware(["AGENT"]), customerController.getCustomers);
router.post("/", authMiddleware(["AGENT", "ADMIN"]), customerController.createCustomer);
router.get("/pending", authMiddleware(["AGENT"]), customerController.getPendingCustomers);
module.exports = router;
