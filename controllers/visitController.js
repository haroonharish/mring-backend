// controllers/visitController.js
const mongoose = require("mongoose");
const Visit = require("../models/Visit");
const Customer = require("../models/Customer");
const Attendance = require("../models/Attendance");

exports.createVisit = async (req, res) => {
  try {
    const { customId, visitDate, customerStatus, remark, updateFrom, latitude, longitude, actionDoneDate, revisitDate, dispoLocationstatus } = req.body;
    const agentId = req.user.userId;

    const today = new Date().toISOString().split("T")[0];
    const time = new Date();
    const attendance = await Attendance.findOne({
      agentId,
      date: today
    });

    if (!attendance || !attendance.checkInTime) {
      return res.status(403).json({
        message: "Please check in before visiting customers"
      });
    }

    if (attendance.checkOutTime) {
  return res.status(403).json({
    message: "You have already checked out"
  });
}

    if (!customId || !visitDate || !customerStatus || !updateFrom) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    if (customerStatus === "CB/Re visit" && !revisitDate) {
  return res.status(400).json({
    message: "Revisit date is required for CB/Re visit status"
  });
}
    const updateFromNormalized = updateFrom.toUpperCase();

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
      customerStatus,
      remark,
      updateFrom: updateFromNormalized,
      revisitDate,
      actionDoneDate,
      time,
      dispoLocationstatus,
      proofFile,
      location: {
        type: "Point",
        coordinates: [longitude, latitude]}

    });

    let customerUpdate = {
  status: "VISITED",
  visitDate,
  customerStatus,
  updateFrom: updateFromNormalized,
    proofFile
};
  if (customerStatus === "CB/Re visit") {
  customerUpdate.status = "REVISIT";
}
    await Customer.findOneAndUpdate(
      { customId: customer.customId },
      customerUpdate
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
