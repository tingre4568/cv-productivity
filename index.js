const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const auth = require("./middleware/auth");
require("dotenv").config();

const app = express();
const port = 5000;

app.use(bodyParser.json());

app.use(cors());

mongoose.connect(
  "mongodb+srv://atultingrework:atultingrework@cluster0.nrhqskx.mongodb.net/cvflexisales"
);

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

app.use("/api/users", userRoutes);
app.use("/api/admin", auth, adminRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "Server is healthy" });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
