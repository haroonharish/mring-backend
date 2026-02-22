const Customer = require("../models/Customer");
const User = require("../models/User");
const axios = require("axios");
const XLSX = require("xlsx");
const ExcelUpload = require("../models/ExcelUpload");
const ExcelJS = require("exceljs");
const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet("Monthly Report");

const generateCustomerId = async () => {
  const count = await Customer.countDocuments();
  return `C${(count + 1).toString().padStart(2, "0")}`;
};

exports.uploadCustomers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const adminId = req.user.userId;
    const fileName = req.file.originalname;
    const fileUrl = req.file.path;
    const now = new Date();

const monthNames = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
];

// Base label (e.g., JAN_2026)
const baseLabel = `${monthNames[now.getMonth()]}_${now.getFullYear()}`;

// Count how many uploads already exist for this month
const existingCount = await ExcelUpload.countDocuments({
  label: { $regex: `^${baseLabel}` }
});

// Final versioned label (e.g., JAN_2026_V1, JAN_2026_V2)
const label = `${baseLabel}_V${existingCount + 1}`;

const uploadHistory = await ExcelUpload.create({
  uploadedBy: adminId,
  label,
  fileName,
  fileUrl
});


    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const workbook = XLSX.read(response.data, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!rows.length) {
       uploadHistory.status = "FAILED";
      await uploadHistory.save();
      return res.status(400).json({ message: "Excel file is empty" });
    }
    let success = 0;
    let failed = [];

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
          failed.push({ row, reason: "Missing required fields" });
          continue;
        }
        const agent = await User.findOne({ username: assignedAgent, role: "AGENT",
    isActive: true });
        if (!agent) {
          failed.push({ row, reason: `Agent ${assignedAgent} not found or inactive` });
          continue;
        }
        if (!customerId) {
          customerId = await generateCustomerId();
        } else {
         const existing = await Customer.findOne({ customId: customerId });
        if (existing) {
          failed.push({ row, reason: "Customer ID already exists" });
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
          status: "PENDING",
          uploadBatchId: uploadHistory._id,
        });
        await newCustomer.save();
        success++;

      } catch (err) {
        failed.push({ row, reason: err.message });
      }
    }

     uploadHistory.totalRows = rows.length;
    uploadHistory.successCount = success;
    uploadHistory.failedCount = failed.length;
    uploadHistory.failedRows = failed;

    uploadHistory.status =
      failed.length === 0
        ? "SUCCESS"
        : success === 0
        ? "FAILED"
        : "PARTIAL";

    await uploadHistory.save();

     res.status(200).json({
      message: "Excel processed",
      uploadId: uploadHistory._id,
      total: rows.length,
      success,
      failedCount: failed.length,
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
    let { agentUsername, status, batchLabel, page = 1, limit = 20 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const query = {};
    if (status) query.status = status.toUpperCase();
    
    if (batchLabel) {
  const batch = await ExcelUpload.findOne({ label: batchLabel });

  if (!batch) {
    return res.status(404).json({ message: "Batch not found" });
  }

  query.uploadBatchId = batch._id;
}


    if (agentUsername) {
      const agent = await User.findOne({ username: agentUsername.trim().toLowerCase(),
  role: "AGENT" });
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
      proofFileUrl: c.proofFile || []
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
        isActive: 1,
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

exports.getExcelUploadHistory = async (req, res) => {
  try {
    const uploads = await ExcelUpload.find()
      .populate("uploadedBy", "username fullName")
      .sort({ createdAt: -1 });

    res.status(200).json(uploads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.generateMonthlyReport = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year required" });
    }
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const customers = await Customer.find().sort({ _id: 1 }).lean();
    const visits = await Visit.find({
    visitDate: {
      $gte: startDate,
      $lte: endDate
  }}).lean();

  const visitMap = {};

visits.forEach(v => {
  if (!visitMap[v.customId]) {
    visitMap[v.customId] = [];
  }
  visitMap[v.customId].push(v);
});
  const reportData = [];

customers.forEach(customer => {
  const customerVisits = visitMap[customer.customId];

  if (customerVisits && customerVisits.length > 0) {
    customerVisits.forEach(v => {
      reportData.push({
        customId: customer.customId,
        customerName: customer.customerName,
        branch: customer.branch,
        scheme: customer.scheme,
        balance: customer.balance,

        visitDate: v.visitDate,
        customerStatus: v.customerStatus,
        remark: v.remark,
        proofFile: v.proofFile?.join(", ") || ""
      });
    });
  } else {
    reportData.push({
      customId: customer.customId,
      customerName: customer.customerName,
      branch: customer.branch,
      scheme: customer.scheme,
      balance: customer.balance,

      visitDate: "",
      customerStatus: "",
      remark: "",
      proofFile: ""
    });
  }
});

worksheet.columns = [
  { header: "Customer ID", key: "customId", width: 15 },
  { header: "Customer Name", key: "customerName", width: 25 },
  { header: "Branch", key: "branch", width: 20 },
  { header: "Scheme", key: "scheme", width: 20 },
  { header: "Balance", key: "balance", width: 15 },
  { header: "Visit Date", key: "visitDate", width: 20 },
  { header: "Status", key: "customerStatus", width: 20 },
  { header: "Remark", key: "remark", width: 40 },
  { header: "Proof Files", key: "proofFile", width: 50 }
];

reportData.forEach(row => worksheet.addRow(row));
worksheet.getRow(1).font = { bold: true };

res.setHeader(
  "Content-Type",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
);

res.setHeader(
  "Content-Disposition",
  `attachment; filename=monthly-report-${month}-${year}.xlsx`
);

await workbook.xlsx.write(res);
res.end();



  } catch (error) {
    console.error("MONTHLY REPORT ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};