// controllers/customerController.js
const Visit = require("../models/Visit");
const Customer = require("../models/Customer");
const generateCustomerId = async () => {
  const count = await Customer.countDocuments();
  return `C${(count + 1).toString().padStart(2, "0")}`;
};

exports.getCustomers = async (req, res) => {
  try {
    const agentId = req.user.userId; 
    const customers = await Customer.find({ assignedAgentId: agentId, isActive: true });
    res.json({ customers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createCustomer = async (req, res) => {
  const { customerName, address, phone, loanId, assignedAgentId, status } = req.body;

  try {
    const customId = await generateCustomerId();

    const newCustomer = new Customer({
      customId,      
      customerName,
      address,
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
    const agentId = req.user.userId; // from JWT

    const customers = await Customer.find({
      assignedAgentId: agentId,
      status: "PENDING",
      isActive: true
    }).sort({ createdAt: -1 });

    res.status(200).json(customers);
  } catch (err) {
    console.error("PENDING CUSTOMERS ERROR:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getVisitedCustomers = async (req, res) => {
  try {
    const agentId = req.user.userId;

    // 1️⃣ Get all visits sorted by latest first
    const visits = await Visit.find({ agentId })
      .sort({ visitDate: -1 });

    if (!visits.length) {
      return res.status(200).json([]);
    }

    // 2️⃣ Keep only latest visit per customId
    const latestVisitMap = {};
    visits.forEach(v => {
      if (!latestVisitMap[v.customId]) {
        latestVisitMap[v.customId] = v;
      }
    });

    const customIds = Object.keys(latestVisitMap);

    // 3️⃣ Fetch customers assigned to this agent
    const customers = await Customer.find({
      customId: { $in: customIds },
      assignedAgentId: agentId
    });

    // 4️⃣ Create customer lookup map
    const customerMap = {};
    customers.forEach(c => {
      customerMap[c.customId] = c;
    });

    // 5️⃣ Merge data
    const response = customIds.map(id => {
      const v = latestVisitMap[id];
      const c = customerMap[id];

      return {
        customId: id,
        customerName: c?.customerName,
        phone: c?.phone,
        address: c?.address,
        branch: c?.branch,
        scheme: c?.scheme,
        balance: c?.balance,
        dueDate: c?.dueDate,
        isNPA: c?.isNPA,

        visit: {
          visitDate: v.visitDate,
          customerStatus: v.customerStatus,
          updateFrom: v.updateFrom,
          remark: v.remark, // ✅ latest remark
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

    // ensure agent owns this customer
    const customer = await Customer.findOne({
      customId,
      assignedAgentId: agentId
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const visits = await Visit.find({ customId })
      .sort({ visitDate: -1 });

    res.status(200).json({
      customer: {
        customId: customer.customId,
        customerName: customer.customerName,
        phone: customer.phone,
        address: customer.address
      },
      visits
    });

  } catch (err) {
    console.error("VISIT HISTORY ERROR:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
