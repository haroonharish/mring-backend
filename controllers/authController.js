// controllers/authController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const CustomerEvent = require("../models/CustomerEvent");
const Counter = require("../models/Counter");

const generateUserId = async (role) => {
  const prefix = role === "ADMIN" ? "AD" : "AG";
  const count = await User.countDocuments({ role });
  return `${prefix}${(count + 1).toString().padStart(2, "0")}`;
};

exports.register = async (req, res) => {
  const { username, password, confirmPassword, fullName, phoneNumber, executiveCustomId  } = req.body;

  // Validation
  if (!username || !password || !confirmPassword || !fullName || !phoneNumber || !executiveCustomId) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (req.user.role === "AGENT") {
  return res.status(403).json({ message: "Agents cannot register other agents" });
}

if (req.user.role !== "EXECUTIVE" && !executiveCustomId) {
  return res.status(400).json({ message: "executiveCustomId is required" });
}

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  // Check if user exists
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(400).json({ message: "Username already exists" });
  }

let executive;
if (req.user.role === "EXECUTIVE") {
  executive = await User.findById(req.user.userId);
} else {
  executive = await User.findOne({ customId: executiveCustomId, role: "EXECUTIVE", isActive: true });
  if (!executive) {
    return res.status(404).json({ message: "Executive not found or inactive" });
  }
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
    phoneNumber,
    executiveId: executive._id
  });

  await user.save();
  res.status(201).json({ message: "Agent registered successfully" });
};

exports.registerExecutive = async (req, res) => {
  try {
    const { username, password, confirmPassword, fullName, phoneNumber } = req.body;

    if (!username || !password || !confirmPassword || !fullName || !phoneNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ message: "Username already taken" });
    }

    const counter = await Counter.findOneAndUpdate(
      { name: "executive" },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true }
    );
    const customId = `EX${String(counter.sequence).padStart(2, "0")}`;

    const hashedPassword = await bcrypt.hash(password, 10);

    const executive = await User.create({
      customId,
      username,
      password: hashedPassword,
      role: "EXECUTIVE",
      fullName,
      phoneNumber,
      mustChangePassword: false
    });

    res.status(201).json({
      message: "Executive registered successfully",
      executive: {
        customId: executive.customId,
        username: executive.username,
        fullName: executive.fullName,
        phoneNumber: executive.phoneNumber
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getExecutives = async (req, res) => {
  try {
    const executives = await User.find({ role: "EXECUTIVE" })
      .select("customId fullName phoneNumber username isActive");

    res.json({ executives });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyAgents = async (req, res) => {
  try {
    const agents = await User.find(
      { role: "AGENT", executiveId: new mongoose.Types.ObjectId(req.user.userId), isActive: true },
      "customId fullName username phoneNumber isActive"
    );
    res.json({ agents });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAgentsList = async (req, res) => {
  try {
    const filter = { role: "AGENT", isActive: true };

    if (req.user.role === "EXECUTIVE") {
      filter.executiveId = new mongoose.Types.ObjectId(req.user.userId);
    }

    const agents = await User.find(filter, "customId fullName username phoneNumber isActive executiveId");
    res.json({ agents });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const user = await User.findOne({ username, isActive: true });
  if (!user) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { userId: user._id, role: user.role },
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

  const user = await User.findOne({ customId: agentId, role: { $in: ["AGENT", "EXECUTIVE"] }, isActive: true });
  if (!user) {
    return res.status(404).json({ message: "Agent not found or inactive" });
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
  const user = await User.findById(req.user.userId);


  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Old password incorrect" });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.mustChangePassword = false;

  await user.save();

  res.json({ message: "Password changed successfully" });
};

exports.deleteAgent = async (req, res) => {
  try {
    const { agentId } = req.body;
if (!agentId) {
      return res.status(400).json({ message: "Agent ID required" });
    }

    const agent = await User.findOne({
      customId: agentId,
      role: { $in: ["AGENT", "EXECUTIVE"] }   
     });

    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    if (req.user.role === "EXECUTIVE") {
  if (!agent.executiveId || agent.executiveId.toString() !== req.user.userId) {
    return res.status(403).json({ message: "Access denied. This agent is not under your supervision." });
  }
}
    if (!agent.isActive) {
      return res.status(400).json({ message: "Agent already deactivated" });
    }

    agent.isActive = false;
    await agent.save();

    res.status(200).json({ message: "Agent deactivated successfully" });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.restoreAgent = async (req, res) => {
  const { agentId } = req.body;

  const agent = await User.findOne({
    customId: agentId,
    role: { $in: ["AGENT", "EXECUTIVE"] }
  });

  if (!agent) {
    return res.status(404).json({ message: "Agent not found" });
  }

  if (req.user.role === "EXECUTIVE") {
  if (!agent.executiveId || agent.executiveId.toString() !== req.user.userId) {
    return res.status(403).json({ message: "Access denied. This agent is not under your supervision." });
  }
}

  if (agent.isActive) {
    return res.status(400).json({ message: "Agent already active" });
  }

  agent.isActive = true;
  await agent.save();

  res.json({ message: "Agent restored successfully" });
};

exports.checkIn = async (req, res) => {
  try {
    const agentId = req.user.userId;
    const { lat, lng } = req.body;

    const today = new Date().toISOString().split("T")[0];

    const existing = await Attendance.findOne({
      agentId,
      date: today
    });

    if (existing) {
      return res.status(400).json({
        message: "Already checked in today"
      });
    }

    const attendance = new Attendance({
      agentId,
      date: today,
      checkInTime: new Date(),
      checkInLocation: { lat, lng }
    });

    await attendance.save();

    res.json({
      message: "Checked in successfully",
      attendance
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const agentId = req.user.userId;
    const { lat, lng } = req.body;

    const today = new Date().toISOString().split("T")[0];

    const attendance = await Attendance.findOne({
      agentId,
      date: today
    });

    if (!attendance) {
      return res.status(400).json({
        message: "Check-in required first"
      });
    }

    if (attendance.checkOutTime) {
      return res.status(400).json({
        message: "Already checked out"
      });
    }

    attendance.checkOutTime = new Date();
    attendance.checkOutLocation = { lat, lng };

    const hours =
      (attendance.checkOutTime - attendance.checkInTime) /
      (1000 * 60 * 60);

    attendance.totalWorkHours = hours;

    await attendance.save();

    res.json({
      message: "Checked out successfully",
      attendance
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAttendanceStatus = async (req, res) => {
  try {
    const agentId = req.user.userId;

    const today = new Date().toISOString().split("T")[0];

    const attendance = await Attendance.findOne({
      agentId,
      date: today
    });

    if (!attendance) {
      return res.json({
        status: "NOT_CHECKED_IN"
      });
    }

    if (attendance.checkOutTime) {
      return res.json({
        status: "CHECKED_OUT",
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime
      });
    }

    return res.json({
      status: "CHECKED_IN",
      checkInTime: attendance.checkInTime
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAgentNotifications = async (req, res) => {
  try {
    const agentId = req.user.userId;

    const notifications = await CustomerEvent.find({ agentId })
      .sort({ createdAt: -1 });

    res.json({
      count: notifications.length,
      notifications
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;

    await CustomerEvent.findByIdAndUpdate(id, { isRead: true });

    res.json({ message: "Marked as read" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.deleteExecutive = async (req, res) => {
  try {
    const { executiveCustomId } = req.body;
    if (!executiveCustomId) {
      return res.status(400).json({ message: "executiveCustomId is required" });
    }

    const executive = await User.findOne({ customId: executiveCustomId, role: "EXECUTIVE" });
    if (!executive) {
      return res.status(404).json({ message: "Executive not found" });
    }

    executive.isActive = false;
    await executive.save();

    res.json({ message: "Executive deactivated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.restoreExecutive = async (req, res) => {
  try {
    const { executiveCustomId } = req.body;
    if (!executiveCustomId) {
      return res.status(400).json({ message: "executiveCustomId is required" });
    }

    const executive = await User.findOne({ customId: executiveCustomId, role: "EXECUTIVE" });
    if (!executive) {
      return res.status(404).json({ message: "Executive not found" });
    }

    executive.isActive = true;
    await executive.save();

    res.json({ message: "Executive activated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.getExecutivesWithAgents = async (req, res) => {
  try {
    const executives = await User.aggregate([
      { $match: { role: "EXECUTIVE" } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "executiveId",
          as: "agents"
        }
      },
      {
        $project: {
          _id: 1,
          customId: 1,
          fullName: 1,
          username: 1,
          phoneNumber: 1,
          isActive: 1,
          agents: {
            $map: {
              input: "$agents",
              as: "agent",
              in: {
                _id: "$$agent._id",
                customId: "$$agent.customId",
                fullName: "$$agent.fullName",
                username: "$$agent.username",
                phoneNumber: "$$agent.phoneNumber",
                isActive: "$$agent.isActive"
              }
            }
          }
        }
      },
      { $sort: { customId: 1 } }
    ]);

    res.json({ executives });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};