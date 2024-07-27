const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");

const secret = "atultingre";

router.post("/signup", async (req, res) => {
  const { name, employeeID, password, dob } = req.body;
  const salt = await bcrypt.genSalt(10);

  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = new User({ name, employeeID, password: hashedPassword, dob });

  try {
    await newUser.save();
    res.status(201).json({ message: "Signup successful" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/login", async (req, res) => {
  const { employeeID, password } = req.body;

  try {
    const user = await User.findOne({ employeeID });

    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign({ id: user._id, name: user.name }, secret);
      res
        .status(200)
        .json({ message: "Login successful", token, name: user.name });
    } else {
      res.status(400).json({ message: "Invalid employeeID or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/forgot_password", async (req, res) => {
  const { employeeID, dob } = req.body;

  try {
    const user = await User.findOne({ employeeID, dob });

    if (user) {
      res.status(200).json({ message: "User verified", employeeID });
    } else {
      res.status(400).json({ message: "Invalid employeeID or date of birth" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/update_password", async (req, res) => {
  const { employeeID, newPassword } = req.body;
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  try {
    const user = await User.findOneAndUpdate(
      { employeeID },
      { password: hashedPassword }
    );

    if (user) {
      res.status(200).json({ message: "Password updated successfully" });
    } else {
      res.status(400).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/fetch_users", auth, async (req, res) => {
  try {
    const users = await User.find({}, "name employeeID dob");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/add_record", auth, async (req, res) => {
  const { date, fileName, companyIVR, directDial, rpcVM, notVerified } =
    req.body;

  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newRecord = {
      date,
      fileName,
      companyIVR,
      directDial,
      rpcVM,
      notVerified,
    };

    user.records.push(newRecord);
    await user.save();
    res.status(201).json({ message: "Record added successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/get_records", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id, "records");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user.records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

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

router.get('/totals', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id, 'records');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const todayTotals = calculateTotals(user.records, startOfDay, now);
    const weekTotals = calculateTotals(user.records, startOfWeek, now);
    const monthTotals = calculateTotals(user.records, startOfMonth, endOfMonth);

    res.status(200).json({
      today: todayTotals,
      week: weekTotals,
      month: monthTotals
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/monthly_totals", auth, async (req, res) => {
  try {
    // Fetch all users
    const users = await User.find({}, "name employeeID records");

    // Function to calculate monthly totals
    const calculateMonthlyTotals = (records) => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const filteredRecords = records.filter((record) => {
        const recordDate = new Date(record.date);
        return (
          recordDate.getFullYear() === now.getFullYear() &&
          recordDate.getMonth() === now.getMonth()
        );
      });

      const totals = filteredRecords.reduce(
        (acc, record) => {
          acc.companyIVR += record.companyIVR || 0;
          acc.directDial += record.directDial || 0;
          acc.rpcVM += record.rpcVM || 0;
          acc.notVerified += record.notVerified || 0;
          return acc;
        },
        { companyIVR: 0, directDial: 0, rpcVM: 0, notVerified: 0 }
      );

      totals.grandTotal =
        totals.companyIVR +
        totals.directDial +
        totals.rpcVM +
        totals.notVerified;
      totals.percentage = (totals.directDial / (totals.grandTotal || 1)) * 100;
      totals.productivity = (totals.directDial + totals.rpcVM) / (totals.grandTotal || 1);

      return totals;
    };

    // Calculate totals for each user
    const userTotals = users.map((user) => {
      const monthlyTotals = calculateMonthlyTotals(user.records);
      return {
        name: user.name,
        employeeID: user.employeeID,
        ...monthlyTotals,
      };
    });

    res.status(200).json(userTotals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
