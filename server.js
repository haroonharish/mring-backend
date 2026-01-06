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
app.use("/agent", customerRoutes); // Routes related to customers
app.use("/agent", visitRoutes); // Routes related to visits
app.use("/admin", adminRoutes);

// Start server
app.listen(5000, () => {
  console.log("Server started on port 5000");
});
