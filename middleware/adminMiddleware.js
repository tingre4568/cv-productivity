const User = require("../models/User");

const adminMiddleware = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: "Access denied" });
    }

    const user = await User.findById(req.user._id);
    if (user && user.isAdmin) {
      next();
    } else {
      res.status(403).json({ message: "Access denied" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = adminMiddleware;
