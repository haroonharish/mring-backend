// routes/visitRoutes.js
const express = require("express");
const visitController = require("../controllers/visitController");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/visit", authMiddleware(["AGENT"]), visitController.createVisit);

module.exports = router;
