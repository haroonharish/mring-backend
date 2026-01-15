// server.js
require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const customerRoutes = require("./routes/customerRoutes");
const visitRoutes = require("./routes/visitRoutes");
const adminRoutes = require("./routes/adminRoutes")

const app = express();

// Middleware
app.use(express.json()); // For parsing JSON data

// Connect to the database
connectDB();

// Use routes
app.use("/auth", authRoutes); // All routes for user authentication
app.use("/agent/customers", customerRoutes); // Routes related to customers
app.use("/agent/visit", visitRoutes); // Routes related to visits
app.use("/admin", adminRoutes);
app.use((req, res, next) => {
  console.log("──────────── REQUEST ────────────");
  console.log("TIME:", new Date().toISOString());
  console.log("METHOD:", req.method);
  console.log("URL:", req.originalUrl);
  console.log("HEADERS:", req.headers);
  next();
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

