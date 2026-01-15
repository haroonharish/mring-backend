// controllers/visitController.js
const mongoose = require("mongoose");
const Visit = require("../models/Visit");
const Customer = require("../models/Customer");

exports.createVisit = async (req, res) => {
    console.log("BODY:", req.body);
  console.log("FILE:", req.file);
  console.log("USER:", req.user);
  const { customId, visitDate, customerStatus, remark, updateFrom } = req.body;
  const agentId = new mongoose.Types.ObjectId(req.user.userId); // From the JWT Middleware

   const customerStatusNormalized = customerStatus
    ? customerStatus.toUpperCase().replace(" ", "_")
    : null;

  const updateFromNormalized = updateFrom ? updateFrom.toUpperCase() : null;

  try {
    if (!customId || !visitDate || !customerStatusNormalized || !updateFromNormalized) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }
    const customer = await Customer.findOne({ customId: customerId });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    const visit = new Visit({
      agentId,
      customId:customer.customId,
      visitDate,
      customerStatus: customerStatusNormalized,
      remark,
      updateFrom: updateFromNormalized,
      proofFile: req.file.path
    });
console.log("VISIT DATA TO SAVE:", {
  agentId,
  customId: customer.customId,
  visitDate,
  customerStatus,
  remark,
  updateFrom,
  proofFile: req.file.path
});

    await visit.save();
    await Customer.findOneAndUpdate({ customId: customer.customId },{ status: "VISITED" });

    res.status(201).json({ message: "Visit submitted successfully", visit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
