// controllers/customerController.js
const Visit = require("../models/Visit");
const Customer = require("../models/Customer");

const generateCustomerId = async () => {
  const count = await Customer.countDocuments();
  return `C${(count + 1).toString().padStart(2, "0")}`;
};

exports.getCustomers = async (req, res) => {
  try {
    const agentId = req.user.userId; 
    const customers = await Customer.find({ assignedAgentId: agentId });
    res.json({ customers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createCustomer = async (req, res) => {
  const { customerName, address, phone, loanId, assignedAgentId, status } = req.body;

  try {
    const customId = await generateCustomerId();

    const newCustomer = new Customer({
      customId,      
      customerName,
      address,
      phone,
      loanId,
      assignedAgentId,
      status: status || "PENDING"
    });

    await newCustomer.save();

    res.status(201).json({
      message: "Customer created successfully",
      customer: newCustomer
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPendingCustomers = async (req, res) => {
  try {
    const agentId = req.user.userId; // from JWT

    const customers = await Customer.find({
      assignedAgentId: agentId,
      status: "PENDING"
    }).sort({ createdAt: -1 });

    res.status(200).json(customers);
  } catch (err) {
    console.error("PENDING CUSTOMERS ERROR:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getVisitedCustomers = async (req, res) => {
  try {
    const agentId = req.user.userId;

    // 1. Get all visits by this agent (latest first)
    const visits = await Visit.find({ agentId })
      .sort({ visitDate: -1 });

    // 2. Pick latest visit per customer (by customId)
    const latestVisitMap = new Map();

    for (const visit of visits) {
      if (!latestVisitMap.has(visit.customId)) {
        latestVisitMap.set(visit.customId, visit);
      }
    }

    const customIds = Array.from(latestVisitMap.keys());

    // 3. Fetch customer details
    const customers = await Customer.find({
      customId: { $in: customIds }
    });

    // 4. Merge customer + visit info
    const response = customers.map(customer => {
      const visit = latestVisitMap.get(customer.customId);

      return {
        customId: customer.customId,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,

        lastVisitDate: visit.visitDate,
        proofType: visit.updateFrom,
        proofFile: visit.proofFile,
        remark: visit.remark
      };
    });

    // 5. Sort again by lastVisitDate (safety)
    response.sort(
      (a, b) => new Date(b.lastVisitDate) - new Date(a.lastVisitDate)
    );

    res.status(200).json(response);

  } catch (err) {
    console.error("VISITED CUSTOMERS ERROR:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
