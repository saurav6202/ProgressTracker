const express = require("express");
const router = express.Router();
const { Progress, OptionalTask } = require("../models/models");

// Save or update progress
router.post("/save-progress", async (req, res) => {
    try {
        const { completedTasks, wrongTasks, mood, journalEntry } = req.body;
        const userId = req.user?.id || req.userId; // Ensure consistency

        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        // Start & end of the day
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);

        const update = {
            completedTasks,
            wrongTasks,
            mood,
            journalEntry,
            date: startOfDay,
            userId
        };

        // Update if exists, else create
        const progress = await Progress.findOneAndUpdate(
            { userId, date: { $gte: startOfDay, $lt: endOfDay } },
            { $set: update },
            { new: true, upsert: true }
        );

        res.status(200).json({
            message: progress.wasNew ? "Progress created!" : "Progress updated!",
            data: progress
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error saving progress" });
    }
});

// Get today's latest progress
router.get("/get-latest-progress", async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const progress = await Progress.findOne({
            userId: req.user?.id || req.userId,
            date: { $gte: today }
        }).lean();

        res.status(200).json(progress || {});
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching progress" });
    }
});

// Get all optional tasks
router.get("/get-optional-tasks", async (req, res) => {
    try {
        const optional = await OptionalTask.find({ userId: req.userId }).sort({ createdAt: -1 }).lean();
        res.json(optional);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching optional tasks" });
    }
});

// Save an optional task
router.post("/save-optional-task", async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: "Task name is required" });

        const newTask = new OptionalTask({ name, userId: req.userId });
        await newTask.save();
        res.json({ message: "Optional task saved", task: newTask });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error saving optional task" });
    }
});

// Delete an optional task
router.delete("/delete-optional-task/:id", async (req, res) => {
    try {
        await OptionalTask.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        res.json({ message: "Deleted" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting optional task" });
    }
});

module.exports = router;