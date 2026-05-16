const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  createReview,
  getAgentReviews,
  updateReview,
  deleteReview,
  getMyReviews
} = require("../controllers/reviewController");

// Admin routes
router.post("/", auth(["ADMIN"]), createReview);
router.get("/agent/:agentCustomId", auth(["ADMIN"]), getAgentReviews);
router.put("/:reviewId", auth(["ADMIN"]), updateReview);
router.delete("/:reviewId", auth(["ADMIN"]), deleteReview);

// Agent route — view own reviews
router.get("/my-reviews", auth(["AGENT"]), getMyReviews);

module.exports = router;