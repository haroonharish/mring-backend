// routes/visitRoutes.js
const express = require("express");
const visitController = require("../controllers/visitController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

const router = express.Router();

const uploadMiddleware = (req, res, next) => {
  upload.array("proofFile", 3)(req, res, (err) => {
    if (err) {
      console.error("❌ MULTER ERROR:");
      console.error(err);
      return res.status(500).json({
        message: "File upload failed",
        error: err.message,
      });
    }

    console.log("📁 MULTER SUCCESS");
    console.log("FILE:", req.files);
    console.log("BODY AFTER MULTER:", req.body);

    next();
  });
};

router.post(
  "/",
  authMiddleware(["AGENT"]),
  uploadMiddleware,
  visitController.createVisit
);

module.exports = router;
