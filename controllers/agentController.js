const Customer = require("../models/Customer");
const Visit = require("../models/Visit");

exports.getCustomers = async (req, res) => {
  const customers = await Customer.find({
    assignedAgentId: req.user.userId
  }).sort({ _id: -1 });

  res.json({ count: customers.length, customers });
};

exports.submitVisit = async (req, res) => {
  const visit = await Visit.create({
    agentId: req.user.userId,
    ...req.body,
    proofFile: req.file.path
  });

  await Customer.findByIdAndUpdate(req.body.customerId, { status: "VISITED" });

  res.status(201).json({ message: "Visit submitted", visit });
};

exports.reportVisit = async (req, res) => {
  const customer = await Customer.findOne({
    _id: req.body.customerId,
    assignedAgentId: req.user.userId
  });

  if (!customer) return res.status(404).json({ message: "Customer not found" });

  customer.status = "VISITED";
  customer.proofFile = req.file.path;
  await customer.save();

  res.json({ message: "Visit reported" });
};
