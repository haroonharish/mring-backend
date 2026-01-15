// controllers/visitController.js
const Visit = require("../models/Visit");
const Customer = require("../models/Customer");

exports.createVisit = async (req, res) => {
  console.log("──────── VISIT CONTROLLER ────────");
  console.log("BODY:", req.body);
  console.log("FILE:", req.file);
  console.log("USER:", req.user);

  try {
    const { customerId, visitDate, customerStatus, remark, updateFrom } = req.body;
    const agentId = req.user?.userId;

    if (!agentId) {
      console.error("❌ agentId missing in JWT");
      return res.status(400).json({ message: "Invalid token payload" });
    }

    if (!customerId || !visitDate || !customerStatus || !updateFrom) {
      console.error("❌ Missing fields", req.body);
      return res.status(400).json({ message: "Missing fields" });
    }

    console.log("🔁 Normalized values:", {
      customerStatus: customerStatus.toUpperCase(),
      updateFrom: updateFrom.toUpperCase(),
    });

    return res.json({ debug: "Controller reached successfully" });

  } catch (err) {
    console.error("❌ CONTROLLER CRASH:", err);
    res.status(500).json({ error: err.message });
  }
};
