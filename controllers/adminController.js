const Customer = require("../models/Customer");
const User = require("../models/User");
const axios = require("axios");
const XLSX = require("xlsx");
const ExcelUpload = require("../models/ExcelUpload");
const ExcelJS = require("exceljs");
const Visit = require("../models/Visit");
const Counter = require("../models/Counter");

const generateCustomerId = async () => {
  const counter = await Counter.findOneAndUpdate(
    { name: "customer" },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );

  return `C${String(counter.sequence).padStart(4, "0")}`;
};

function parseExcelDate(value) {
  if (!value) return null;

  if (typeof value === "number") {
    return new Date((value - 25569) * 86400 * 1000);
  }

  if (typeof value === "string") {
    const [day, month, year] = value.trim().split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  return null;
}

exports.uploadCustomers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const adminId = req.user.userId;
    const fileName = req.file.originalname;
    const { mode = "update", replaceUploadIds = [] } = req.body;
    const fileUrl = req.file.path;
    const now = new Date();

const monthNames = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
];

const baseLabel = `${monthNames[now.getMonth()]}_${now.getFullYear()}`;

const existingCount = await ExcelUpload.countDocuments({
  label: { $regex: `^${baseLabel}` }
});

const label = `${baseLabel}_V${existingCount + 1}`;

const uploadHistory = await ExcelUpload.create({
  uploadedBy: adminId,
  label,
  fileName,
  fileUrl,
  replacedUploadIds: replaceUploadIds,
  isCurrent: true
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

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  const rowNumber = i + 2;
    try {
    const loanId = row["CUST_ID"]?.toString().trim();
    const customerName = row["ACCT_NAME"]?.trim();
    const accountNo = row["ACCOUNT"]?.toString().trim();
    const branch = row["BRANCHNAME"]?.trim();
    const scheme = row["SCHEME"]?.trim();
    const dueDate = parseExcelDate(row["DUE_DT"]);
    const totalFund = Number(row["EMI"]) || 0;
    const balance = Number(row["BALANCE"]) || 0;
    const dpd = Number(row["DPD"]) || 0;
    const arrear = Number(row["ARREAR"]) || 0;
    const latestDPD = Number(row["Ltest DPD"]) || 0;
    const latestArrears = Number(row["Ltest Arrear"]) || 0;
    const address = row["ADDRESS"]?.trim();
    const assignedAgent = row["ASSIGNED_AGENT"]?.trim();
    const collectPhones = (row, fields) => {
  return [...new Set(
    fields
      .map(field => row[field])
      .filter(Boolean)
      .map(num => num.toString().trim())
      .filter(num => num.length > 0)
  )];
};

const phones = collectPhones(row, [
  "MOB_NUM",
  "PHONE",
  "PHONE_2",
  "PHONE_3",
  "PHONE_4"
]);

const coBorrowerPhones = collectPhones(row, [
  "CO_BOR_PHONE",
  "CO_BOR_PHONE_2",
  "CO_BOR_PHONE_3",
  "CO_BOR_PHONE_4"
]);


    let missingFields = [];

if (!loanId) missingFields.push("CUST_ID");
if (!customerName) missingFields.push("ACCT_NAME");
if (!assignedAgent) missingFields.push("ASSIGNED_AGENT");

if (missingFields.length > 0) {
  failed.push({
    rowNumber,
    custId: loanId || "N/A",
    message: `Missing required field(s): ${missingFields.join(", ")}`
  });
  continue;
}

    const agent = await User.findOne({
      username: assignedAgent,
      role: "AGENT",
      isActive: true
    });

if (!agent) {
  failed.push({
    rowNumber,
    custId: loanId || "N/A",
    message: `Agent ${assignedAgent} not found or inactive`
  });
  continue;
}

    const existingCustomer = await Customer.findOne({ loanId });

    if (existingCustomer) {

      existingCustomer.customerName = customerName;
      existingCustomer.accountNo = accountNo;
      existingCustomer.branch = branch;
      existingCustomer.scheme = scheme;
      existingCustomer.totalFund = totalFund;
      existingCustomer.balance = balance;
      existingCustomer.dpd = dpd;
      existingCustomer.arrear = arrear;
      existingCustomer.latestDPD = latestDPD;
      existingCustomer.latestArrears = latestArrears;
      existingCustomer.dueDate = dueDate;
      existingCustomer.phone = phones;
      existingCustomer.coBorrowerPhones = coBorrowerPhones;
      existingCustomer.assignedAgentId = agent._id;
      existingCustomer.uploadBatchId = uploadHistory._id;
      existingCustomer.address = address;
      existingCustomer.status = "PENDING";
      existingCustomer.visitDate = null;
      existingCustomer.customerStatus = null;
      existingCustomer.updateFrom = null;
      existingCustomer.proofFile = [];

      await existingCustomer.save();
      success++;
      continue;
    }

    const customId = await generateCustomerId();

    const newCustomer = new Customer({
      customId,
      loanId,
      customerName,
      address,
      accountNo,
      branch,
      scheme,
      totalFund,
      balance,
      dpd,
      arrear,
      latestDPD,
      latestArrears,
      dueDate,
      phone: phones,
      coBorrowerPhones,
      assignedAgentId: agent._id,
      status: "PENDING",
      uploadBatchId: uploadHistory._id
    });

    await newCustomer.save();
    success++;

  } catch (err) {
  failed.push({
    rowNumber,
    custId: row["CUST_ID"] || "N/A",
    message: err.message
  });
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

    if (mode === "replace" && uploadHistory.status !== "FAILED") {
  await ExcelUpload.updateMany(
    { _id: { $in: replaceUploadIds } },
    { $set: { isCurrent: false } }
  );

  uploadHistory.isCurrent = true;
}

    await uploadHistory.save();

     res.status(200).json({
      message: "Excel processed",
      uploadId: uploadHistory._id,
      total: rows.length,
      success,
      failedCount: failed.length,
      fileUrl,
      errors: failed
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
  try {
    const agents = await User.aggregate([
      { $match: { role: "AGENT" } },

      {
        $lookup: {
          from: "customers",
          localField: "_id",
          foreignField: "assignedAgentId",
          as: "customers"
        }
      },

      {
        $lookup: {
          from: "visits",
          let: { agentId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$agentId", "$$agentId"] }
              }
            },
            { $sort: { actionDoneDate: -1 } },
            { $limit: 1 },
            {
              $project: {
                actionDoneDate: 1,
                latitude: { $arrayElemAt: ["$location.coordinates", 1] },
                longitude: { $arrayElemAt: ["$location.coordinates", 0] }
              }
            }
          ],
          as: "latestVisit"
        }
      },

      {
        $unwind: {
          path: "$latestVisit",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $addFields: {
          totalCustomers: { $size: "$customers" },
          completedCustomers: {
            $size: {
              $filter: {
                input: "$customers",
                as: "c",
                cond: { $eq: ["$$c.status", "VISITED"] }
              }
            }
          }
        }
      },

      {
        $project: {
          _id: 0,
          agentId: "$customId",
          name: "$fullName",
          phoneNumber: 1,
          isActive: 1,
          totalCustomers: 1,
          completedCustomers: 1,
          latestLocation: {
             $cond: [
        { $ifNull: ["$latestVisit", false] },
        {
            latitude: "$latestVisit.latitude",
            longitude: "$latestVisit.longitude",
            actionDoneDate: "$latestVisit.actionDoneDate"
          },
          null
        ]
      }
        }
      }
    ]);

    res.status(200).json({ agents });

  } catch (err) {
    console.error("Agent Summary Error:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.getAgentCustomers = async (req, res) => {
  try {
    const { agentCustomId } = req.params;

    // 1️⃣ Find the agent
    const agent = await User.findOne({ customId: agentCustomId, role: "AGENT" });
if (!agent) return res.status(404).json({ message: "Agent not found" });
const latestVisit = await Visit.findOne(
  { agentId: agent._id },
  {},
  { sort: { visitDate: -1 } }
);

let latestLocation = null;

    if (
      latestVisit &&
      latestVisit.location &&
      latestVisit.location.coordinates &&
      latestVisit.location.coordinates.length === 2
    ) {
      latestLocation = {
        latitude: latestVisit.location.coordinates[1],
        longitude: latestVisit.location.coordinates[0],
        visitDate: latestVisit.visitDate
      };
    }

    // 2️⃣ Aggregate customers with latest visit
    const customers = await Customer.aggregate([
      { $match: { assignedAgentId: agent._id } },

      // Lookup all visits for the customer
      { $lookup: {
          from: "visits",
          localField: "customId",
          foreignField: "customId",
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
          loanId: 1,
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
          coBorrowerPhones: 1,
          isNPA: 1,
          status: 1,
          lastRemark: "$lastVisit.remark",
          proofFile: "$lastVisit.proofFile",
          visitDate: "$lastVisit.visitDate",
          latitude: { $arrayElemAt: ["$lastVisit.location.coordinates", 1] },
          longitude: { $arrayElemAt: ["$lastVisit.location.coordinates", 0] },
        }
      }
    ]);

    res.json({
      agent: {
        agentId: agent.customId,
        name: agent.fullName,
        latestLocation
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

    const formatted = uploads.map(u => ({
      _id: u._id,
      label: u.label,
      fileName: u.fileName,
      uploadedBy: u.uploadedBy?.fullName,
      uploadedAt: u.createdAt,
      status: u.status,
      totalRows: u.totalRows,
      successCount: u.successCount,
      failedCount: u.failedCount,
      isCurrent: u.isCurrent,
      errors: u.failedRows
    }));

    res.status(200).json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.generateBatchReport = async (req, res) => {
  try {
    const { uploadId } = req.params;

    if (!uploadId) {
      return res.status(400).json({ message: "Upload ID required" });
    }

    const batch = await ExcelUpload.findById(uploadId);
    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }

    const response = await axios.get(batch.fileUrl, {
      responseType: "arraybuffer"
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(response.data);

    const worksheet = workbook.worksheets[0];

    const customers = await Customer.find({
      uploadBatchId: uploadId
    }).lean();

    if (!customers.length) {
      return res.status(404).json({ message: "No customers found in this batch" });
    }

    const loanIdToCustomId = {};
    customers.forEach(c => {
      loanIdToCustomId[String(c.loanId).trim()] = c.customId;
    });

    const visits = await Visit.find({
      customId: { $in: customers.map(c => c.customId) }
    }).lean();

    const visitMap = {};
    visits.forEach(v => {
      if (!visitMap[v.customId]) {
        visitMap[v.customId] = [];
      }
      visitMap[v.customId].push(v);
    });

    const headerRow = worksheet.getRow(1);
    const lastColumn = worksheet.columnCount;

    headerRow.getCell(lastColumn + 1).value = "Visit Date";
    headerRow.getCell(lastColumn + 2).value = "Customer Status";
    headerRow.getCell(lastColumn + 3).value = "Remark";
    headerRow.getCell(lastColumn + 4).value = "Updated From";
    headerRow.getCell(lastColumn + 5).value = "Proof File";

    headerRow.font = { bold: true };

    const custIdColumnIndex = 4;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const loanIdCellValue = row.getCell(custIdColumnIndex).value;

      if (!loanIdCellValue) return;

      const loanId = String(loanIdCellValue).trim();

      const systemCustomId = loanIdToCustomId[loanId];

      const customerVisits = visitMap[systemCustomId];

      if (customerVisits && customerVisits.length > 0) {
        const visitDates = customerVisits.map(v => v.visitDate).join(", ");
        const statuses = customerVisits.map(v => v.customerStatus).join(", ");
        const remarks = customerVisits.map(v => v.remark).join(" | ");
        const updateFrom = customerVisits.map(v => v.updateFrom).join(", ");
        const proofFiles = customerVisits.map(v => v.proofFile).join(", ");

        row.getCell(lastColumn + 1).value = visitDates;
        row.getCell(lastColumn + 2).value = statuses;
        row.getCell(lastColumn + 3).value = remarks;
        row.getCell(lastColumn + 4).value = updateFrom;
        row.getCell(lastColumn + 5).value = proofFiles;

      } else {
        row.getCell(lastColumn + 1).value = "";
        row.getCell(lastColumn + 2).value = "NOT VISITED";
        row.getCell(lastColumn + 3).value = "";
        row.getCell(lastColumn + 4).value = "";
        row.getCell(lastColumn + 5).value = "";
      }
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=report-${batch.label}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("BATCH REPORT ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

