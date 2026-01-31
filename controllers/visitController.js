// controllers/visitController.js
const mongoose = require("mongoose");
const Visit = require("../models/Visit");
const Customer = require("../models/Customer");

exports.createVisit = async (req, res) => {
  try {
    const { customId, visitDate, customerStatus, remark, updateFrom } = req.body;

    if (!customId || !visitDate || !customerStatus || !updateFrom) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    // Normalize enums
    const customerStatusNormalized = customerStatus
      .toUpperCase()
      .replace(" ", "_");

    const updateFromNormalized = updateFrom.toUpperCase();

    // 🔥 Agent ID — let mongoose cast it
    const agentId = req.user.userId;

    // 🔥 FIX: correct variable name
    const customer = await Customer.findOne({ customId });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: "Proof file is required" });
    }

    const visit = await Visit.create({
      agentId,
      customId: customer.customId,
      visitDate,
      customerStatus: customerStatusNormalized,
      remark,
      updateFrom: updateFromNormalized,
      proofFile: req.file.path

    });

    await Customer.findOneAndUpdate(
      { customId: customer.customId },
      { status: "VISITED",
         visitDate,
    customerStatus: customerStatusNormalized,
    updateFrom: updateFromNormalized,
    proofFile: req.file.path
       }
    );

    res.status(201).json({
      message: "Visit submitted successfully",
      visit
    });

  } catch (err) {
    console.error("CREATE VISIT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};
