const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const User = require("../models/User");
const adminMiddleware = require("../middleware/adminMiddleware");

const calculateTotals = (records, startDate, endDate) => {
  const filteredRecords = records.filter(record => {
    const recordDate = new Date(record.date);
    return recordDate >= startDate && recordDate <= endDate;
  });

  const totals = filteredRecords.reduce((acc, record) => {
    acc.companyIVR += record.companyIVR || 0;
    acc.directDial += record.directDial || 0;
    acc.rpcVM += record.rpcVM || 0;
    acc.notVerified += record.notVerified || 0;
    return acc;
  }, { companyIVR: 0, directDial: 0, rpcVM: 0, notVerified: 0 });

  totals.grandTotal = totals.companyIVR + totals.directDial + totals.rpcVM + totals.notVerified;
  totals.percentage = (totals.directDial / (totals.grandTotal || 1)) * 100;
  totals.productivity = (totals.directDial + totals.rpcVM) / (totals.grandTotal || 1);

  return totals;
};

router.get("/user_totals", adminMiddleware, async (req, res) => {
  try {
    const { period } = req.query;
    const users = await User.find({}, "name employeeID records");

    const now = new Date();
    let startDate, endDate = now;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - startDate.getDay());
        startDate.setHours(0, 0, 0, 0); // Set to start of the day
        endDate.setHours(23, 59, 59, 999); // Set to end of the day
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      default:
        return res.status(400).json({ message: 'Invalid period' });
    }

    const userTotals = users.map((user) => {
      const totals = calculateTotals(user.records, startDate, endDate);
      return {
        name: user.name,
        employeeID: user.employeeID,
        [period]: totals,
      };
    });

    res.status(200).json({ userTotals });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get("/users", adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({}, "name employeeID isAdmin");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/users", adminMiddleware, async (req, res) => {
  const { name, employeeID, password, isAdmin } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User({
      name,
      employeeID,
      password: hashedPassword,
      isAdmin,
    });

    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put('/users/:id', adminMiddleware, async (req, res) => {
  const { name, employeeID, password, isAdmin } = req.body;
  
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = name || user.name;
    user.employeeID = employeeID || user.employeeID;
    user.isAdmin = isAdmin !== undefined ? isAdmin : user.isAdmin;
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();
    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


router.delete("/users/:id", adminMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
