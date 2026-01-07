// routes/visitRoutes.js
const express = require("express");
const visitController = require("../controllers/visitController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

const router = express.Router();

router.post("/", authMiddleware(["AGENT"]), upload.single("proofFile"), visitController.createVisit);

module.exports = router;
