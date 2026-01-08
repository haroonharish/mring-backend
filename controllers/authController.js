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
  const { username, password, confirmPassword, fullName, phoneNumber } = req.body;

  // Validation
  if (!username || !password || !confirmPassword || !fullName || !phoneNumber) {
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
    role: "AGENT",
    fullName,
    phoneNumber
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
    name: user.fullName,
    agentId: user.customId,
    message: "Login successful",
    token,
    role: user.role,
    mustChangePassword: user.mustChangePassword
  });
};

exports.resetAgentPassword = async (req, res) => {
  const { agentId } = req.body;

  const user = await User.findOne({ customId: agentId, role: "AGENT" });
  if (!user) {
    return res.status(404).json({ message: "Agent not found" });
  }

  const tempPassword = "Temp@123";
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  user.password = hashedPassword;
  user.mustChangePassword = true;

  await user.save();

  res.json({
    message: "Password reset successful",
    temporaryPassword: tempPassword
  });
};

exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findOne({ customId: req.user.userId });

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Old password incorrect" });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.mustChangePassword = false;

  await user.save();

  res.json({ message: "Password changed successfully" });
};
