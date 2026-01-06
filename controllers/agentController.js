const Customer = require("../models/Customer");
const Visit = require("../models/Visit");

exports.getCustomers = async (req, res) => {
  const customers = await Customer.find({
    assignedAgentId: req.user.userId
  }).sort({ _id: -1 });

  res.json({ count: customers.length, customers });
};

exports.submitVisit = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Proof file is required" });
    }

  const visit = await Visit.create({
    agentId: req.user.userId,
    ...req.body,
    proofFile: req.file.path
  });

  await Customer.findByIdAndUpdate(req.body.customerId, { status: "VISITED" });

  res.status(201).json({ message: "Visit submitted", visit });
} catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to submit visit" });
  }
};

exports.reportVisit = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Proof file is required" });
    }

  const customer = await Customer.findOne({
    _id: req.body.customerId,
    assignedAgentId: req.user.userId
  });

  if (!customer) return res.status(404).json({ message: "Customer not found" });

  customer.status = "VISITED";
  customer.proofFile = req.file.path;
  await customer.save();

  res.json({ message: "Visit reported" });
} catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to report visit" });
  }
};