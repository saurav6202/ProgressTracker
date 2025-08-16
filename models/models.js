const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedTasks: [String],
  wrongTasks: [String],
  mood: String,
  journalEntry: String,
  date: { type: Date, default: Date.now }
});

progressSchema.index({ userId: 1, date: 1 }, { unique: true });

const goalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  goal: { type: String, required: true },
  progress: { type: Number, default: 0 },
  days: { type: Number, required: true },
  streak: { type: Number, default: 0 },
  prevStreak: { type: Number, default: 0 },
  lastCompletedDate: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Sort goals by newest first for a given user
goalSchema.index({ userId: 1, createdAt: -1 });

const optionalTaskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: String,
  email: String,
}, { timestamps: true });

const Progress = mongoose.model("Progress", progressSchema);
const Goals = mongoose.model("Goals", goalSchema);
const OptionalTask = mongoose.model("OptionalTask", optionalTaskSchema);
const User = mongoose.model("User", userSchema);

module.exports = {
  Progress,
  Goals,
  OptionalTask,
  User,
}