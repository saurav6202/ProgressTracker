const express = require("express");
const router = express.Router();
const { Progress } = require("../models/models");

// Get all journals
router.get("/get-journals", async (req, res) => {
    const journals = await Progress.find({ userId: req.userId })
    res.json(journals);
});

// Update journal by ID
router.put("/journal/:id", async (req, res) => {
    await Progress.findByIdAndUpdate(req.params.id, { journalEntry: req.body.journalEntry });
    res.json({ message: "Journal updated" });
});

// Delete journal by ID
router.delete("/journal/:id", async (req, res) => {
    await Progress.findByIdAndDelete(req.params.id);
    res.json({ message: "Journal deleted" });
});

module.exports = router;
