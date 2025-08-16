const express = require("express");
const router = express.Router();
const { Progress, Goals } = require("../models/models");

router.get("/get-analytics", async (req, res) => {
    const entries = await Progress.find({ userId: req.userId }).sort({ date: 1 });

    const taskStats = {
        dates: [],
        completed: [],
        wrong: []
    };

    const moodStats = {
        dates: [],
        moods: []
    };

    const moodMap = { sad: 1, neutral: 2, happy: 3, excited: 4, awesome: 5 };

    entries.forEach(entry => {
        const date = new Date(entry.date).toLocaleDateString("en-GB");
        taskStats.dates.push(date);
        taskStats.completed.push(entry.completedTasks.length);
        taskStats.wrong.push(entry.wrongTasks.length);

        moodStats.dates.push(date);
        moodStats.moods.push(moodMap[entry.mood] || 2);
    });

    const goals = await Goals.find({ userId: req.userId });
    const goalStats = {
        names: goals.map(g => g.goal),
        progress: goals.map(g => g.progress),
        days: goals.map(g => g.days)
    };

    res.json({ taskStats, moodStats, goalStats });
});

router.get("/get-mood-stats", async (req, res) => {
    try {
        const entries = await Progress.find({ userId: req.userId }).sort({ date: 1 }).lean();

        const moodMap = {
            "sad": 1,
            "neutral": 2,
            "happy": 3,
            "excited": 4,
            "awesome": 5,
        };

        const dates = [];
        const moods = [];

        entries.forEach(entry => {
            if (entry.mood) {
                dates.push(new Date(entry.date).toLocaleDateString("en-IN"));
                moods.push(moodMap[entry.mood.toLowerCase()] || 0);
            }
        });

        res.json({ dates, moods });

    } catch (err) {
        console.error("Mood stats error:", err);
        res.status(500).json({ message: "Failed to fetch mood data" });
    }
});

module.exports = router;
