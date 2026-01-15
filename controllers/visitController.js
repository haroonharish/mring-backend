// controllers/visitController.js
const Visit = require("../models/Visit");
const Customer = require("../models/Customer");

exports.createVisit = async (req, res) => {
    console.log("BODY:", req.body);
  console.log("FILE:", req.file);
  console.log("USER:", req.user);
  const { customId, visitDate, customerStatus, remark, updateFrom } = req.body;
  const agentId = req.user.userId; // From the JWT Middleware

  try {
    if (!customId || !visitDate || !customerStatus || !updateFrom) {
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
      customerStatus,
      remark,
      updateFrom,
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
