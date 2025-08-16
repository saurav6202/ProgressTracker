const express = require("express");
const router = express.Router();
const { Goals } = require("../models/models");

// Create goal
router.post("/save-goals", async (req, res) => {
    try {
        const { goal, days } = req.body;
        const newGoal = new Goals({
            goal,
            days,
            userId: req.userId,
        });

        const response = await newGoal.save();
        return res.json({ goal: response, redirect: "goals" });
    } catch (e) {
        console.log("error in creating goal: ", e);
        res.json({ error: "Error in creating goal" });
    }
});

// Get all goals
router.get("/get-goals", async (req, res) => {
    try {
        const goals = await Goals.find({ userId: req.userId }).sort({ createdAt: -1 });
        res.status(200).json(goals);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching goals" });
    }
});

// Update goal
router.put("/goals/:id", async (req, res) => {
    try {
        const { goal, days } = req.body;
        await Goals.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            { goal, days }
        );

        res.json({ message: "Goal updated!" });
    } catch (err) {
        res.status(500).json({ error: "Failed to update goal" });
    }
});

// Delete goal
router.delete("/goals/:id", async (req, res) => {
    try {
        await Goals.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        res.json({ message: "Goal deleted successfully" });
    } catch (err) {
        console.error("Error deleting goal:", err);
        res.status(500).json({ error: "Failed to delete goal" });
    }
});

// ✅ Update goal progress + streak logic in one route
router.post("/update-goal-progress", async (req, res) => {
    const { goalId, isIncrement } = req.body;

    try {
        const goal = await Goals.findById(goalId);
        if (!goal) return res.status(404).json({ message: "Goal not found" });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split("T")[0];

        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        if (isIncrement) {
            // ✅ Already completed today
            if (goal.lastCompletedDate === todayStr) {
                if (goal.streak === 0 && goal.prevStreak > 0) {
                    goal.streak = goal.prevStreak; // restore streak on same-day re-check
                    goal.prevStreak = 0;
                }
            } else {
                goal.progress += 1;

                if (goal.lastCompletedDate === yesterdayStr) {
                    goal.streak += 1;
                } else if (goal.prevStreak > 0) {
                    // restoring from same-day uncheck
                    goal.streak = goal.prevStreak;
                } else {
                    goal.streak = 1;
                }

                goal.lastCompletedDate = todayStr;
                goal.prevStreak = 0;
            }
        } 
        else {
            // ✅ Uncheck only allowed for today
            if (goal.lastCompletedDate === todayStr) {
                goal.prevStreak = goal.streak; // save streak so we can restore if re-checked
                goal.streak = 0;
                goal.lastCompletedDate = null;
            }
            goal.progress = Math.max(goal.progress - 1, 0);
        }

        await goal.save();
        const completed = goal.progress >= goal.days;

        res.status(200).json({
            message: "Goal updated",
            progress: goal.progress,
            streak: goal.streak,
            completed,
            goal
        });

    } catch (err) {
        console.error("Update goal error:", err);
        res.status(500).json({ message: "Failed to update goal" });
    }
});

// Add days to a goal
router.post("/add-goal-days", async (req, res) => {
    const { goalId, daysToAdd } = req.body;
    if (!goalId || !daysToAdd) {
        return res.json({ success: false, message: "Missing goalId or daysToAdd" });
    }

    try {
        const goal = await Goals.findById(goalId);
        if (!goal) return res.json({ success: false, message: "Goal not found" });

        goal.days += parseInt(daysToAdd);
        goal.completed = false;
        await goal.save();

        res.json({ success: true, message: "Days added successfully" });
    } catch (err) {
        console.error("Error adding days:", err);
        res.json({ success: false, message: "Server error" });
    }
});

module.exports = router;