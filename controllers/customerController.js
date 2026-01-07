// controllers/customerController.js
const Customer = require("../models/Customer");

exports.getCustomers = async (req, res) => {
  try {
    const agentId = req.user.userId; // From the JWT Middleware
    const customers = await Customer.find({ assignedAgentId: agentId });
    res.json({ customers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createCustomer = async (req, res) => {
  const { customerName, address, phone, loanId, assignedAgentId, status } = req.body;
  
  try {
    const count = await Customer.countDocuments();
    const customId = 'C${(count + 1).toString().padStart(2, "0")}';
    const newCustomer = new Customer({
      customerName,
      address,
      phone,
      loanId,
      assignedAgentId,
      status: status || "PENDING"
    });

    await newCustomer.save();
    res.status(201).json({ message: "Customer created successfully", customer: newCustomer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
