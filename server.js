// server.js
require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const customerRoutes = require("./routes/customerRoutes");
const visitRoutes = require("./routes/visitRoutes");
const adminRoutes = require("./routes/adminRoutes")

const app = express();

app.use(express.json());

connectDB();

app.use("/auth", authRoutes);
app.use("/agent/customers", customerRoutes);
app.use("/agent/visit", visitRoutes);
app.use("/admin", adminRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

