require("dotenv").config(); 

const express = require("express");
const app = express();
const path = require("path");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const loggedUserOnly = require("./auth/auth");
const connectDB = require("./db"); 
connectDB();

// Environment variables
const port = process.env.PORT || 7000;

// 🔐 Security Middleware
app.use(helmet());

// 🔧 Core Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

// ✅ Routes
app.get("/", loggedUserOnly, (req, res) => {
  res.render("index");
});

// Protected routes
const routes = [
  require("./routes/home"),
  require("./routes/goals"),
  require("./routes/journal"),
  require("./routes/analytics"),
];
routes.forEach(route => app.use(loggedUserOnly, route));

// User routes (signup/login/logout)
const userRouter = require("./routes/user");
app.use("/user", userRouter);

// Partials loader
app.get("/partials/:section", loggedUserOnly, (req, res) => {
  const section = req.params.section;
  const validSections = ["home", "goals", "journal", "analytics"];

  if (!validSections.includes(section)) {
    return res.status(404).render("404", { message: "Section not found" });
  }

  res.render(`partials/${section}`);
});

// ❌ 404 Handler
app.use((req, res) => {
  res.status(404).render("404", { message: "Page not found" });
});

// ⚠️ Global Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.stack);
  res.status(500).render("500", { message: "Something went wrong!" });
});

// 🚀 Start Server
app.listen(port, () =>
  console.log(`✅ Server running on http://localhost:${port}`)
);
