const Review = require("../models/Review");
const User = require("../models/User");

// Admin: submit a review for an agent
exports.createReview = async (req, res) => {
  try {
    const { agentCustomId, rating, comment } = req.body;

    if (!agentCustomId || !rating || !comment) {
      return res.status(400).json({ message: "agentCustomId, rating and comment are required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const agent = await User.findOne({ customId: agentCustomId, role: "AGENT" });
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    const review = await Review.create({
      agentId: agent._id,
      reviewedBy: req.user.userId,
      rating,
      comment
    });

    res.status(201).json({ message: "Review submitted successfully", review });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: get all reviews for a specific agent
exports.getAgentReviews = async (req, res) => {
  try {
    const { agentCustomId } = req.params;

    const agent = await User.findOne({ customId: agentCustomId, role: "AGENT" });
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    const reviews = await Review.find({ agentId: agent._id })
      .populate("reviewedBy", "fullName")
      .sort({ createdAt: -1 });

    const averageRating =
      reviews.length > 0
        ? parseFloat(
            (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
          )
        : null;

    res.json({
      agentId: agentCustomId,
      agentName: agent.fullName,
      averageRating,
      totalReviews: reviews.length,
      reviews
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: edit a review
exports.updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (rating) review.rating = rating;
    if (comment) review.comment = comment;
    await review.save();

    res.json({ message: "Review updated", review });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: delete a review
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findByIdAndDelete(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.json({ message: "Review deleted successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Agent: get own reviews
exports.getMyReviews = async (req, res) => {
  try {
    const agentId = req.user.userId;

    const reviews = await Review.find({ agentId })
      .populate("reviewedBy", "fullName")
      .sort({ createdAt: -1 });

    const averageRating =
      reviews.length > 0
        ? parseFloat(
            (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
          )
        : null;

    res.json({
      averageRating,
      totalReviews: reviews.length,
      reviews
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};