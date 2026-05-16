// server.js
require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const customerRoutes = require("./routes/customerRoutes");
const visitRoutes = require("./routes/visitRoutes");
const adminRoutes = require("./routes/adminRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const cron = require("node-cron");
const axios = require("axios");

const app = express();

app.use(express.json());

// DB
connectDB();

// Routes
app.use("/auth", authRoutes);
app.use("/agent/customers", customerRoutes);
app.use("/agent/visit", visitRoutes);
app.use("/admin", adminRoutes);
app.use("/reviews", reviewRoutes);
// Health check (important for keep-alive)
app.get("/health", (req, res) => {
  console.log("🔥 Health endpoint hit:", new Date().toISOString());
  res.status(200).send("OK");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);

  // ---- KEEP ALIVE CRON ----
  if (process.env.KEEP_ALIVE_URL) {
    cron.schedule("*/14 * * * *", async () => {
      try {
        const res = await axios.get(process.env.KEEP_ALIVE_URL, {
          timeout: 10000,
        });

        console.log(
          `✅ Keep-alive ping ${res.status} @ ${new Date().toISOString()}`
        );
      } catch (err) {
        console.error(
          "❌ Keep-alive failed:",
          err.response?.status || err.message
        );
      }
    });

    console.log("⏱️ Keep-alive cron scheduled");
  } else {
    console.log("⚠️ KEEP_ALIVE_URL not set, cron not started");
  }
});
