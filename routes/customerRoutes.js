// routes/customerRoutes.js
const express = require("express");
const customerController = require("../controllers/customerController");
const authMiddleware = require("../middleware/authMiddleware"); // JWT Auth Middleware
const router = express.Router();

router.get("/customers", authMiddleware(["AGENT"]), customerController.getCustomers);
router.post("/create", authMiddleware(["AGENT", "ADMIN"]), customerController.createCustomer);

module.exports = router;
