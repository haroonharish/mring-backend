// controllers/visitController.js
const Visit = require("../models/Visit");
const Customer = require("../models/Customer");

exports.createVisit = async (req, res) => {
  const { customerId, visitDate, customerStatus, remark, updateFrom } = req.body;
  const agentId = req.user.userId; // From the JWT Middleware

  try {
    if (!customerId || !visitDate || !customerStatus || !updateFrom) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    const visit = new Visit({
      agentId,
      customerId,
      visitDate,
      customerStatus,
      remark,
      updateFrom,
      proofFile: req.file.path
    });

    await visit.save();
    await Customer.findByIdAndUpdate(customerId, { status: "VISITED" });

    res.status(201).json({ message: "Visit submitted successfully", visit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
