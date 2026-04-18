const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");

app.use(cors());

// 👇 ADD THIS LINE (VERY IMPORTANT)
app.use(express.static(path.join(__dirname, "../Frontend")));

// API
app.get("/api/data", (req, res) => {
    res.json({ message: "Hello from backend" });
});

// default route (optional but good)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../Frontend/index.html"));
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});