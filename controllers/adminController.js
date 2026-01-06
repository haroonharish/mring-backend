const Customer = require("../models/Customer");
const User = require("../models/User");

// Admin: get customer reports with filters & pagination
exports.getCustomerReports = async (req, res) => {
  try {
    let { agentUsername, status, page = 1, limit = 20 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const query = {};
    if (status) query.status = status.toUpperCase();

    if (agentUsername) {
      const agent = await User.findOne({ username: agentUsername.trim().toLowerCase() });
      if (!agent) return res.status(404).json({ message: "Agent not found" });
      query.assignedAgentId = agent._id;
    }

    const total = await Customer.countDocuments(query);

    const customers = await Customer.find(query)
      .populate({ path: "assignedAgentId", select: "username" })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const result = customers.map(c => ({
      _id: c._id,
      customerName: c.customerName,
      address: c.address,
      phone: c.phone,
      loanAmount: c.loanAmount,
      assignedAgent: c.assignedAgentId.username,
      status: c.status,
      visitDate: c.visitDate,
      customerStatus: c.customerStatus,
      updateFrom: c.updateFrom,
      proofFileUrl: c.proofFile ? `${req.protocol}://${req.get("host")}/${c.proofFile.replace(/\\/g, "/")}` : null
    }));

    res.json({ count: result.length, page, limit, total, customers: result });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
