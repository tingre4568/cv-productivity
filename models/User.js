const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  employeeID: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  records: [{
    date: { type: Date, required: true },
    fileName: { type: String, required: true },
    companyIVR: { type: Number, default: 0 },
    directDial: { type: Number, default: 0 },
    rpcVM: { type: Number, default: 0 },
    notVerified: { type: Number, default: 0 }
  }]
});

module.exports = mongoose.model('User', UserSchema);
