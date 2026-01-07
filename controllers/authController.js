// controllers/authController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const generateUserId = async (role) => {
  const prefix = role === "ADMIN" ? "AD" : "AG";
  const count = await User.countDocuments({ role });
  return `${prefix}${(count + 1).toString().padStart(2, "0")}`;
};

exports.register = async (req, res) => {
  const { username, password, confirmPassword } = req.body;

  // Validation
  if (!username || !password || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  // Check if user exists
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(400).json({ message: "Username already exists" });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const customId = await generateUserId("AGENT");

  // Save new user
  const user = new User({
    customId,
    username,
    password: hashedPassword,
    role: "AGENT" // Default role for registration
  });

  await user.save();
  res.status(201).json({ message: "Agent registered successfully" });
};

exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const user = await User.findOne({ username });
  if (!user) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { userId: user.customId, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({
    name: user.username,
    agentId: user.customerId,
    message: "Login successful",
    token,
    role: user.role
  });
};
