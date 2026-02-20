// controllers/visitController.js
const mongoose = require("mongoose");
const Visit = require("../models/Visit");
const Customer = require("../models/Customer");

exports.createVisit = async (req, res) => {
  try {
    const { customId, visitDate, customerStatus, remark, updateFrom, latitude, longitude } = req.body;

    if (!customId || !visitDate || !customerStatus || !updateFrom) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    const customerStatusNormalized = customerStatus
      .toUpperCase()
      .replace(" ", "_");

    const updateFromNormalized = updateFrom.toUpperCase();

    const agentId = req.user.userId;

    const customer = await Customer.findOne({ customId });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Proof file is required" });
    }
    const proofFile = req.files.map(file => file.path);

    const visit = await Visit.create({
      agentId,
      customId: customer.customId,
      visitDate,
      customerStatus: customerStatusNormalized,
      remark,
      updateFrom: updateFromNormalized,
      proofFile,
      location: {
        type: "Point",
        coordinates: [longitude, latitude]}

    });

    await Customer.findOneAndUpdate(
      { customId: customer.customId },
      { status: "VISITED",
         visitDate,
    customerStatus: customerStatusNormalized,
    updateFrom: updateFromNormalized,
    proofFile
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
