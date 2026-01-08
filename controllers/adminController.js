const Customer = require("../models/Customer");
const User = require("../models/User");
const axios = require("axios");
const XLSX = require("xlsx");

const generateCustomerId = async () => {
  const count = await Customer.countDocuments();
  return `C${(count + 1).toString().padStart(2, "0")}`;
};

exports.uploadCustomers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileUrl = req.file.path;
    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const workbook = XLSX.read(response.data, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!rows.length) {
      return res.status(400).json({ message: "Excel file is empty" });
    }
    const results = { success: 0, failed: [] };

    for (const row of rows) {
      try {
        let {
          customerId,
          customerName,
          phone,
          branch,
          accountNo,
          bankName,
          scheme,
          dueDate,
          balance,
          totalFund,
          lastPaidAmount,
          address,
          isNPA,
          assignedAgent
        } = row;

         if (!customerName || !phone || !assignedAgent) {
          results.failed.push({ row, reason: "Missing required fields" });
          continue;
        }
        const agent = await User.findOne({ username: assignedAgent, role: "AGENT" });
        if (!agent) {
          results.failed.push({ row, reason: `Agent ${assignedAgent} not found` });
          continue;
        }
        if (!customerId) {
          customerId = await generateCustomerId();
        } else {
         const existing = await Customer.findOne({ customId: customerId });
        if (existing) {
          results.failed.push({ row, reason: "Customer ID already exists" });
          continue;
        }
      }
          const newCustomer = new Customer({
          customId: customerId,
          customerName,
          phone,
          branch,
          accountNo,
          bankName,
          scheme,
          dueDate: dueDate ? new Date(dueDate) : null,
          balance,
          totalFund,
          lastPaidAmount,
          address,
          isNPA: isNPA === "YES" || isNPA === true,
          assignedAgentId: agent._id,
          status: "PENDING"
        });
        await newCustomer.save();
        results.success++;

      } catch (err) {
        results.failed.push({ row, reason: err.message });
      }
    }

    res.status(200).json({
      message: `${results.success} customers uploaded successfully`,
      failedRows: results.failed,
      fileUrl
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};


// Admin: get customer reports with filters & pagination
exports.getCustomerReports = async (req, res) => {
  try {
    let { agentUsername, status, page = 1, limit = 20 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const query = {};
    if (status) query.status = status.toUpperCase();

    if (agentUsername) {
      const agent = await User.findOne({ username: agentUsername.trim().toLowerCase() });
      if (!agent) return res.status(404).json({ message: "Agent not found" });
      query.assignedAgentId = agent._id;
    }

    const total = await Customer.countDocuments(query);

    const customers = await Customer.find(query)
      .populate({ path: "assignedAgentId", select: "username" })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const result = customers.map(c => ({
      _id: c._id,
      customerName: c.customerName,
      address: c.address,
      phone: c.phone,
      loanAmount: c.loanAmount,
      assignedAgent: c.assignedAgentId.username,
      status: c.status,
      visitDate: c.visitDate,
      customerStatus: c.customerStatus,
      updateFrom: c.updateFrom,
      proofFileUrl: c.proofFile || null
  }));

    res.json({ count: result.length, page, limit, total, customers: result });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAgentsSummary = async (req, res) => {
  const agents = await User.aggregate([
    { $match: { role: "AGENT" } },
    { $lookup: {
        from: "customers",
        localField: "_id",
        foreignField: "assignedAgentId",
        as: "customers"
      }
    },
    { $addFields: {
        totalCustomers: { $size: "$customers" },
        completedCustomers: { 
          $size: { 
            $filter: { input: "$customers", as: "c", cond: { $eq: ["$$c.status", "VISITED"] } } 
          } 
        }
      }
    },
    { $project: {
        _id: 0,
        agentId: "$customId",
        name: "$fullName",
        totalCustomers: 1,
        completedCustomers: 1
      }
    }
  ]);

  res.json({ agents });
};

exports.getAgentCustomers = async (req, res) => {
  try {
    const { agentCustomId } = req.params;

    // 1️⃣ Find the agent
    const agent = await User.findOne({ customId: agentCustomId, role: "AGENT" });
    if (!agent) return res.status(404).json({ message: "Agent not found" });

    // 2️⃣ Aggregate customers with latest visit
    const customers = await Customer.aggregate([
      { $match: { assignedAgentId: agent._id } },

      // Lookup all visits for the customer
      { $lookup: {
          from: "visits",
          localField: "customId",
          foreignField: "customerId",
          as: "visits"
        }
      },

      // Add last visit (latest remark)
      { $addFields: {
          lastVisit: { $arrayElemAt: [
            { $sortArray: { input: "$visits", sortBy: { visitDate: -1 } } }, 
            0 
          ] }
        } 
      },

      // Project only required fields for admin
      { $project: {
          _id: 0,
          customerId: "$customId",
          customerName: 1,
          branch: 1,
          accountNo: 1,
          bankName: 1,
          scheme: 1,
          dueDate: 1,
          balance: 1,
          totalFund: 1,
          lastPaidAmount: 1,
          phone: 1,
          address: 1,
          isNPA: 1,
          status: 1,
          lastRemark: "$lastVisit.remark"
        }
      }
    ]);

    res.json({
      agent: {
        agentId: agent.customId,
        name: agent.fullName
      },
      customers
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};