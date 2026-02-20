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
    const customers = await Customer.find({ assignedAgentId: agentId });
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
      status: "PENDING"
    }).sort({ createdAt: -1 });

    res.status(200).json(customers);
  } catch (err) {
    console.error("PENDING CUSTOMERS ERROR:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getVisitedCustomers = async (req, res) => {
  try {
    const agentId = new mongoose.Types.ObjectId(req.user.userId);

    const customers = await Customer.aggregate([
      {
        $match: {
          assignedAgentId: agentId,
          status: "VISITED"
        }
      },
      {
        $lookup: {
          from: "visits", // collection name (must match MongoDB collection name)
          let: { customerId: "$customId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$customId", "$$customerId"] },
                    { $eq: ["$agentId", agentId] }
                  ]
                }
              }
            },
            { $sort: { visitDate: -1 } },
            { $limit: 1 }
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
        $project: {
          customId: 1,
          customerName: 1,
          phone: 1,
          address: 1,
          branch: 1,
          scheme: 1,
          balance: 1,
          dueDate: 1,
          isNPA: 1,
          visit: {
            visitDate: "$latestVisit.visitDate",
            customerStatus: "$latestVisit.customerStatus",
            updateFrom: "$latestVisit.updateFrom",
            remark: "$latestVisit.remark",
            proofFiles: {
              $ifNull: ["$latestVisit.proofFiles", []]
            }
          }
        }
      },
      { $sort: { "visit.visitDate": -1 } }
    ]);

    res.status(200).json(customers);

  } catch (error) {
    console.error("GET VISITED CUSTOMERS ERROR:", error);
    res.status(500).json({ message: "Server error" });
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
