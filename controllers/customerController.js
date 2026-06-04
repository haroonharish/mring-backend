const Visit = require("../models/Visit");
const Customer = require("../models/Customer");
const CustomerEvent = require("../models/CustomerEvent");
const mongoose = require("mongoose");

const generateCustomerId = async () => {
  const count = await Customer.countDocuments();
  return `C${(count + 1).toString().padStart(2, "0")}`;
};

exports.getCustomers = async (req, res) => {
  try {
    const agentId = req.user.userId;
    const customers = await Customer.find({ assignedAgentId: agentId, isActive: true });

    // Attach latest unread alert per customer
    const customerIds = customers.map((c) => c._id);
    const activeAlerts = await CustomerEvent.find({
      customerId: { $in: customerIds },
      isRead: false
    }).sort({ createdAt: -1 });

    const alertMap = {};
    activeAlerts.forEach((a) => {
      const key = a.customerId.toString();
      if (!alertMap[key]) {
        alertMap[key] = { id: a._id, message: a.message };
      }
    });

    const result = customers.map((c) => ({
      ...c.toObject(),
      alert: alertMap[c._id.toString()] || null
    }));

    res.json({ customers: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createCustomer = async (req, res) => {
  const { customerName, permanentAddress, coBorrowerAddress, temporaryAddress, phone, loanId, assignedAgentId, status } = req.body;

  try {
    const customId = await generateCustomerId();

    const newCustomer = new Customer({
      customId,
      customerName,
      permanentAddress,
      coBorrowerAddress,
      temporaryAddress,
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
    const agentId = req.user.userId;

    const customers = await Customer.find({
      assignedAgentId: agentId,
      status: "PENDING",
      isActive: true
    }).sort({ createdAt: -1 });

    // Attach latest unread alert per customer
    const customerIds = customers.map((c) => c._id);
    const activeAlerts = await CustomerEvent.find({
      customerId: { $in: customerIds },
      isRead: false
    }).sort({ createdAt: -1 });

    const alertMap = {};
    activeAlerts.forEach((a) => {
      const key = a.customerId.toString();
      if (!alertMap[key]) {
        alertMap[key] = { id: a._id, message: a.message };
      }
    });

    const result = customers.map((c) => ({
      ...c.toObject(),
      alert: alertMap[c._id.toString()] || null
    }));

    res.status(200).json(result);
  } catch (err) {
    console.error("PENDING CUSTOMERS ERROR:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getVisitedCustomers = async (req, res) => {
  try {
    const agentId = req.user.userId;

    const visits = await Visit.find({ agentId }).sort({ visitDate: -1 });

    if (!visits.length) {
      return res.status(200).json([]);
    }

    const latestVisitMap = {};
    visits.forEach((v) => {
      if (!latestVisitMap[v.customId]) {
        latestVisitMap[v.customId] = v;
      }
    });

    const customIds = Object.keys(latestVisitMap);

    const customers = await Customer.find({
      customId: { $in: customIds },
      assignedAgentId: agentId
    });

    const customerMap = {};
    customers.forEach((c) => {
      customerMap[c.customId] = c;
    });

    // Attach latest unread alert per customer
    const customerIds = customers.map((c) => c._id);
    const activeAlerts = await CustomerEvent.find({
      customerId: { $in: customerIds },
      isRead: false
    }).sort({ createdAt: -1 });

    const alertMap = {};
    activeAlerts.forEach((a) => {
      const key = a.customerId.toString();
      if (!alertMap[key]) {
        alertMap[key] = { id: a._id, message: a.message };
      }
    });

    const response = customIds.map((id) => {
      const v = latestVisitMap[id];
      const c = customerMap[id];

      return {
        customId: id,
        loanId: c?.loanId,
        customerName: c?.customerName,
        phone: c?.phone,
        permanentAddress: c?.permanentAddress,
        coBorrowerAddress: c?.coBorrowerAddress,
        temporaryAddress: c?.temporaryAddress,
        branch: c?.branch,
        accountNo: c?.accountNo,
        bankName: c?.bankName,
        totalFund: c?.totalFund,
        scheme: c?.scheme,
        balance: c?.balance,
        dueDate: c?.dueDate,
        isNPA: c?.isNPA,
        dpd: c?.dpd,
        arrear: c?.arrear,
        lastPaid: c?.lastPaid,
        latestDPD: c?.latestDPD,
        latestArrears: c?.latestArrears,
        lastPaidDate: c?.lastPaidDate,
        lastPaidTotal: c?.lastPaidTotal,
        npaDate: c?.npaDate,
        alert: alertMap[c?._id?.toString()] || null,
        visit: {
          visitDate: v.visitDate,
          customerStatus: v.customerStatus,
          updateFrom: v.updateFrom,
          remark: v.remark,
          proofFile: v.proofFile || []
        }
      };
    });

    res.status(200).json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching visited customers" });
  }
};

exports.getCustomerVisitHistory = async (req, res) => {
  try {
    const { customId } = req.params;
    const agentId = req.user.userId;

    const customer = await Customer.findOne({
      customId,
      assignedAgentId: agentId
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const visits = await Visit.find({ customId }).sort({ visitDate: -1 });

    // Latest unread — triggers popup
    const alert = await CustomerEvent.findOne({
      customerId: customer._id,
      isRead: false
    }).sort({ createdAt: -1 });

    // Latest message overall — always visible on screen even after dismissal
    const latestMessage = await CustomerEvent.findOne({
      customerId: customer._id
    })
      .sort({ createdAt: -1 })
      .select("_id message type isRead createdAt source");

    res.status(200).json({
      customer: {
        customId: customer.customId,
        customerName: customer.customerName,
        phone: customer.phone,
        permanentAddress: customer.permanentAddress,
        coBorrowerAddress: customer.coBorrowerAddress,
        temporaryAddress: customer.temporaryAddress
      },
      alert: alert ? { id: alert._id, message: alert.message } : null,
      latestMessage: latestMessage ?? null,
      visits
    });

  } catch (err) {
    console.error("VISIT HISTORY ERROR:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};