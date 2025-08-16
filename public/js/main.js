// Global reference to Chart
let progressChart;

// HOME PAGE INITIALIZER
async function initHomePage() {
    // Fetch and restore previous data
    try {
        const res = await fetch("/get-latest-progress");
        const saved = await res.json();

        await loadInitialProgress("home");
        await loadGoals();
        await loadOptionalTasks();
        await attachCheckboxListeners();
        addDateBtnFnc();
        // ✅ Restore checkboxes
        saved.completedTasks?.forEach(task => {
            const label = Array.from(document.querySelectorAll("#requiredTasks .task-label"))
                .find(lbl => lbl.innerText.trim() === task.trim());
            if (label) {
                const cb = label.previousElementSibling;
                cb.checked = true;
                label.classList.add("completed");
            }
        });

        saved.wrongTasks?.forEach(task => {
            const label = Array.from(document.querySelectorAll("#optionalTasks .task-label"))
                .find(lbl => lbl.innerText.trim() === task.trim());
            if (label) {
                const cb = label.previousElementSibling;
                cb.checked = true;
                label.classList.add("completed");
            }
        });

        // ✅ Restore mood
        if (saved.mood) {
            document.querySelectorAll(".mood-btn").forEach(btn => {
                if (btn.dataset.mood === saved.mood) {
                    btn.classList.add("active");
                }
            });
        }

        // ✅ Restore journal
        if (saved.journalEntry) {
            const journalInput = document.querySelector(".journal-input");
            if (journalInput) journalInput.value = saved.journalEntry;
        }

    } catch (err) {
        console.warn("No saved progress to load.", err);
    }

    // Date display
    const dateDisplay = document.getElementById('dateDisplay');
    if (dateDisplay) {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateDisplay.textContent = today.toLocaleDateString('en-US', options);
    }

    // Mood buttons
    const moodButtons = document.querySelectorAll('.mood-btn');
    moodButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            moodButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            saveProgressToBackend();
        });
    });

    // Journal save after pause
    const journalInput = document.querySelector('.journal-input');
    if (journalInput) {
        let journalTimer;
        journalInput.addEventListener('input', () => {
            clearTimeout(journalTimer);
            journalTimer = setTimeout(saveProgressToBackend, 800);
        });
    }

    // OPTIONAL TASKS input box toggling and saving
    document.getElementById("toggleOptionalInput").addEventListener("click", () => {
        document.querySelector(".formCon").classList.toggle("hidden");
        document.querySelector("#optionalTaskInput").focus();
    });
    document.getElementById("optionalTaskForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = document.getElementById("optionalTaskInput");
        const name = input.value.trim();
        if (!name) return;

        try {
            const res = await fetch("/save-optional-task", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name })
            });
            const data = await res.json();
            input.value = "";
            document.querySelector(".formCon").classList.toggle("hidden");
            await loadOptionalTasks();
            await attachCheckboxListeners();
            loadOptionalTasks(); // Refresh list
        } catch (err) {
            console.error("Failed to save optional task:", err);
        }
    });
    // Task checkboxes
    // document.querySelectorAll('.task-checkbox').forEach(cb => {
    //     cb.addEventListener('change', () => {
    //         updateProgressChart();
    //         saveProgressToBackend();
    //     });
    // });
    updateProgressChart();
}
initHomePage();

// GOAL PAGE INITIALIZER
async function initGoalsPage() {
    await loadInitialProgress("goals");

    const goalForm = document.querySelector(".goalForm");
    const addBtn = document.querySelector(".add-goal-btn");

    addBtn.addEventListener("click", (e) => {
        e.preventDefault();
        goalForm.classList.toggle("hidden");
        document.querySelector("#goalInput").focus();
    });

    document.getElementById("goalForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const goal = document.querySelector("#goalInput").value.trim();
        const days = parseInt(document.querySelector("#goalDays").value);

        const goalData = { goal, days };

        try {
            const res = await fetch("/save-goals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(goalData)
            });

            const data = await res.json();
            if (res.ok) {
                appendGoalToUI(data.goal);
                document.querySelector("#goalInput").value = "";
                document.querySelector("#goalDays").value = "";
                goalForm.classList.add("hidden");
            }
        } catch (err) {
            console.error("Error saving goal:", err);
        }
    });

    // ✅ Load goals from DB
    try {
        const res = await fetch("/get-goals");
        const goals = await res.json();

        const container = document.querySelector("#goalList");
        container.innerHTML = "";
        goals.forEach(goal => appendGoalToUI(goal));
    } catch (err) {
        console.error("Failed to fetch goals:", err);
    }

    // ✅ Append Goal with Event Bindings
    function appendGoalToUI(goal) {
        const container = document.getElementById("goalList");
        const percentage = Math.round((goal.progress || 0) / goal.days * 100);

        const item = document.createElement("div");
        item.className = "goal-item";
        item.setAttribute("data-id", `${goal._id}`);
        item.innerHTML = `
            <div class="goal-header">
                <span class="goal-title">${goal.goal}</span>
                <div class="goal-actions">
                    <button class="edit-goal">✏️</button>
                    <button class="delete-goal">🗑️</button>
                </div>
            </div>
            <div class="goal-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%;"></div>
                </div>
                <span class="progress-text">${goal.progress || 0} / ${goal.days} days</span>
            </div>
        `;
        container.appendChild(item);

        // DELETE
        item.querySelector(".delete-goal").addEventListener("click", async () => {
            if (confirm("Delete this goal?")) {
                await fetch(`/goals/${goal._id}`, { method: "DELETE" });
                loadSection("goals");
            }
        });

        // ✅ EDIT (open modal with pre-filled values + disable background)
        item.querySelector(".edit-goal").addEventListener("click", () => {
            document.getElementById("editGoalId").value = goal._id;
            document.getElementById("editGoalInput").value = goal.goal;
            document.getElementById("editGoalDays").value = goal.days;
            document.getElementById("editGoalModal").classList.remove("hidden");
            document.body.classList.add("modal-open"); // 👈 disable background scroll/clicks
        });
    }

    // ✅ Edit Modal: Save Changes
    document.getElementById("editGoalForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = document.getElementById("editGoalId").value;
        const goal = document.getElementById("editGoalInput").value.trim();
        const days = parseInt(document.getElementById("editGoalDays").value);

        try {
            const res = await fetch(`/goals/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ goal, days })
            });

            const data = await res.json();
            if (data.message) {
                document.getElementById("editGoalModal").classList.add("hidden");
                document.body.classList.remove("modal-open"); // 👈 restore background interaction
                loadSection("goals");
            }
        } catch (err) {
            console.error("Edit error:", err);
        }
    });

    // ✅ Close Edit Modal
    document.querySelector(".close-btn").addEventListener("click", () => {
        document.getElementById("editGoalModal").classList.add("hidden");
        document.body.classList.remove("modal-open"); // 👈 restore background interaction
    });
}

async function initJournalPage() {
    await loadInitialProgress("journal");

    const journalForm = document.getElementById("journalForm");
    const journalInput = document.getElementById("journalEntry");
    const journalList = document.getElementById("journalList");

    const editModal = document.getElementById("editJournalModal");
    const editInput = document.getElementById("editJournalInput");
    const editId = document.getElementById("editJournalId");

    // 1. Save today's journal
    if (journalForm) {
        journalForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const journalEntry = journalInput.value.trim();

            if (!journalEntry) return;

            try {
                const res = await fetch("/save-progress", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ journalEntry })
                });

                const data = await res.json();
                if (data.message) {
                    alert("Journal saved!");
                    loadSection("journal"); // Refresh journal list
                }
            } catch (err) {
                console.error("Failed to save journal:", err);
            }
        });
    }

    // 2. Show all journals
    try {
        const res = await fetch("/get-journals");
        const journals = await res.json();

        const container = document.querySelector("#journalList");
        container.innerHTML = "";

        journals.forEach(journal => appendJournalToUI(journal));
    } catch (err) {
        console.error("Failed to fetch journals:", err);
    }

    // ✅ Helper: Append journal with edit/delete buttons
    function appendJournalToUI(journal) {
        const formattedDate = new Date(journal.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });

        const item = document.createElement("div");
        item.className = "journal-item";
        item.setAttribute("data-id", journal._id);
        item.innerHTML = `
            <div class="journal-header">
                <span class="journal-date">${formattedDate}</span>
                <div class="journal-actions">
                    <button class="edit-journal">✏️</button>
                    <button class="delete-journal">🗑️</button>
                </div>
            </div>
            <p class="journal-text">${journal.journalEntry || ""}</p>
        `;

        journalList.appendChild(item);

        // ✏️ Edit button: open modal with values
        item.querySelector(".edit-journal").addEventListener("click", () => {
            editId.value = journal._id;
            editInput.value = journal.journalEntry;
            editModal.classList.remove("hidden");
            document.body.classList.add("modal-open");
        });

        // 🗑️ Delete button
        item.querySelector(".delete-journal").addEventListener("click", async () => {
            if (confirm("Are you sure you want to delete this journal?")) {
                try {
                    const res = await fetch(`/journal/${journal._id}`, { method: "DELETE" });
                    const data = await res.json();
                    if (data.message) {
                        item.remove();
                        alert("Journal deleted.");
                    }
                } catch (err) {
                    console.error("Delete failed:", err);
                }
            }
        });
    }

    // ✅ Edit Modal: Submit updated journal
    document.getElementById("editJournalForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = editId.value;
        const updatedText = editInput.value.trim();

        if (!updatedText) return;

        try {
            const res = await fetch(`/journal/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ journalEntry: updatedText })
            });

            const data = await res.json();
            if (data.message) {
                editModal.classList.add("hidden");
                document.body.classList.remove("modal-open");
                loadSection("journal");
            }
        } catch (err) {
            console.error("Edit failed:", err);
        }
    });

    // ✅ Close modal
    document.querySelector("#editJournalModal .close-btn").addEventListener("click", () => {
        editModal.classList.add("hidden");
        document.body.classList.remove("modal-open");
    });
}

async function initAnalyticsPage() {
    await loadInitialProgress("analytics");

    try {
        const res = await fetch("/get-analytics");
        const { taskStats, moodStats, goalStats } = await res.json();

        const moodRes = await fetch("/get-mood-stats");
        const stats = await moodRes.json();

        renderTaskChart(taskStats);
        renderMoodChart(stats);
        renderGoalChart(goalStats);
    } catch (err) {
        console.error("Analytics error:", err);
    }

    // 📊 Task Chart
    function renderTaskChart(stats) {
        document.addEventListener('DOMContentLoaded', () => {
            const canvas = document.getElementById('taskChart');
            canvas.width = data.labels.length * 100; // Adjust width per data
        });

        const ctx = document.getElementById('taskChart').getContext('2d');

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: stats.dates,
                datasets: [
                    {
                        label: '✅ Completed Tasks',
                        data: stats.completed,
                        backgroundColor: '#6c5ce7',
                        borderRadius: 8,
                    },
                    {
                        label: '❌ Wrong Tasks',
                        data: stats.wrong,
                        backgroundColor: '#d73a12ff',
                        borderRadius: 8,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 700,
                    easing: 'easeOutCubic'
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 13,
                                family: 'Inter, sans-serif'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: '#2d3436',
                        titleColor: '#fff',
                        bodyColor: '#dfe6e9',
                        callbacks: {
                            label: ctx => `${ctx.dataset.label}: ${ctx.raw} task${ctx.raw !== 1 ? 's' : ''}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            callback: val => Number.isInteger(val) ? val : ''
                        },
                        grid: {
                            color: '#f0f0f0'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // 😊 Mood Chart
    function renderMoodChart(stats) {
        const ctx = document.getElementById('moodChart').getContext('2d');

        // Mood levels: emoji + text
        const moodLevels = {
            1: "😞 Sad",
            2: "😐 Neutral",
            3: "😊 Happy",
            4: "😁 Excited",
            5: "🤩 Awesome"
        };

        // Emoji-only version
        const moodEmojis = {
            1: "😞",
            2: "😐",
            3: "😊",
            4: "😁",
            5: "🤩"
        };

        // Use emoji-only labels on small screens
        const isMobile = window.innerWidth <= 600;

        // Create gradient from green (good) to red (bad)
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, '#a29bfe'); // green
        gradient.addColorStop(1, '#6c5ce7'); // red

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: stats.dates,
                datasets: [{
                    label: 'Mood Over Time',
                    data: stats.moods,
                    fill: true,
                    backgroundColor: gradient,
                    borderColor: '#6d5afeff',
                    tension: 0.35,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#6d5afeff',
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 800,
                    easing: 'easeOutCubic'
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: ctx => moodLevels[ctx.raw] || "Unknown"
                        }
                    },
                    legend: { display: false }
                },
                scales: {
                    y: {
                        min: 1,
                        max: 5,
                        ticks: {
                            stepSize: 1,
                            callback: val => isMobile
                                ? moodEmojis[val] || val
                                : moodLevels[val] || val,
                            font: {
                                size: isMobile ? 18 : 13
                            }
                        },
                        grid: {
                            color: '#f0f0f0'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }


    // 🎯 Goal Progress Mini Doughnuts
    function renderGoalChart(stats) {
        const container = document.getElementById("goalProgressGrid");
        container.innerHTML = "";

        stats.names.forEach((name, i) => {
            const progress = stats.progress[i];
            const days = stats.days[i];
            const percent = Math.floor((progress / days) * 100);

            const card = document.createElement("div");
            card.className = "goal-card card";
            card.innerHTML = `
                <canvas id="goalChart-${i}" width="150" height="150"></canvas>
                <p>${name}</p>
            `;
            container.appendChild(card);

            const ctx = document.getElementById(`goalChart-${i}`).getContext("2d");

            const centerTextPlugin = {
                id: 'centerText',
                beforeDraw(chart) {
                    const { width, height, ctx } = chart;
                    const text = chart.config.options.centerText;

                    ctx.save();
                    ctx.font = `bold 18px Inter, sans-serif`;
                    ctx.fillStyle = "#2d3436";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(text, width / 2, height / 2);
                    ctx.restore();
                }
            };

            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ["Completed", "Remaining"],
                    datasets: [{
                        data: [percent, 100 - percent],
                        backgroundColor: ['#6c5ce7', '#dfe6e9'],
                        borderWidth: 0
                    }]
                },
                options: {
                    cutout: "70%",
                    maintainAspectRatio: false,
                    centerText: `${percent}%`,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: ctx => `${ctx.label}: ${ctx.raw}%`
                            }
                        }
                    }
                },
                plugins: [centerTextPlugin]
            });
        });
    }
}

// Progress chart logic
function updateProgressChart() {
    const requiredCheckboxes = Array.from(document.querySelectorAll("#requiredTasks .task-checkbox"));
    const optionalCheckboxes = Array.from(document.querySelectorAll("#optionalTasks .task-checkbox"));

    const totalRequired = requiredCheckboxes.length;
    const completedRequired = requiredCheckboxes.filter(cb => cb.checked).length;
    const completedOptional = optionalCheckboxes.filter(cb => cb.checked).length;
    const remainingRequired = totalRequired - completedRequired;

    const maxChartValue = totalRequired || 1;
    const wrongValue = Math.min(completedOptional, maxChartValue);

    let chartLabels = ['Good Actions', 'Wrong Actions', 'Remaining'];
    let chartData = [completedRequired, wrongValue, remainingRequired];
    let chartColors = ['#6c5ce7', '#e74c3c', '#dfe6e9'];

    if (completedRequired === totalRequired && wrongValue === 0) {
        chartLabels = ['Good Actions'];
        chartData = [100];
        chartColors = ['#6c5ce7'];
    }

    const total = chartData.reduce((sum, val) => sum + val, 0);
    const percentage = totalRequired ? Math.round((completedRequired / totalRequired) * 100) : 0;

    // Save globally for backend
    window.currentChartPercentages = {
        good: Math.round((completedRequired / totalRequired) * 100),
        wrong: Math.round((wrongValue / maxChartValue) * 100),
        remaining: Math.round((remainingRequired / maxChartValue) * 100)
    };

    const canvas = document.getElementById('progressChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const data = {
        labels: chartLabels,
        datasets: [{
            data: chartData,
            backgroundColor: chartColors,
            borderWidth: 0,
            cutout: '70%'
        }]
    };

    const centerTextPlugin = {
        id: 'centerText',
        beforeDraw(chart) {
            const { width, height, ctx } = chart;
            const dataset = chart.data.datasets[0]?.data || [];

            const good = dataset[0] || 0;
            const total = dataset.reduce((sum, val) => sum + val, 0);
            const percent = total > 0 ? Math.round((good / total) * 100) : 0;

            let mainText = `${percent}%`;
            let subText = "Stay focused!";

            if (percent === 100) {
                mainText = "100%";
                subText = "Well Done 🎉";
            } else if (percent === 0) {
                mainText = "0%";
                subText = "Start your journey!";
            }

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#333';

            ctx.font = `bold ${height / 14}px Inter, sans-serif`;
            ctx.fillText(mainText, width / 2, height / 2 - 10);

            ctx.font = `normal ${height / 28}px Inter, sans-serif`;
            ctx.fillStyle = '#777';
            ctx.fillText(subText, width / 2, height / 2 + 20);

            ctx.restore();
        }
    };

    const config = {
        type: 'doughnut',
        data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 800,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${context.label}: ${context.raw} task${context.raw !== 1 ? 's' : ''}`;
                        }
                    }
                }
            }
        },
        plugins: [centerTextPlugin]
    };

    if (!progressChart || progressChart.canvas !== canvas) {
        progressChart = new Chart(ctx, config);
    } else {
        progressChart.data = data;
        progressChart.options = config.options;
        progressChart.update();
    }
}

async function loadOptionalTasks() {
    try {
        const res = await fetch("/get-optional-tasks");
        const tasks = await res.json();
        const ul = document.getElementById("optionalTasks");
        ul.innerHTML = "";

        tasks.forEach(task => {
            const li = document.createElement("li");
            li.className = "task-item";
            li.innerHTML = `
                <div>
                    <input type="checkbox" class="task-checkbox wrong-task-checkbox" id="${task._id}">
                    <label for="${task._id}" class="task-label">${task.name}</label>
                </div>
                <button class="delete-optional" data-id="${task._id}">🗑️</button>
            `;
            ul.appendChild(li);
        });

        // Attach event listeners again after rendering
        document.querySelectorAll(".delete-optional").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.dataset.id;
                await fetch(`/delete-optional-task/${id}`, { method: "DELETE" });
                await loadOptionalTasks();
                await attachCheckboxListeners();
            });
        });

        // Re-bind checkbox behavior
        document.querySelectorAll(".task-checkbox").forEach(cb => {
            cb.addEventListener("change", () => {
                cb.nextElementSibling.classList.toggle("completed", cb.checked);
                updateProgressChart();
                // saveProgressToBackend();
            });
        });

    } catch (err) {
        console.error("Failed to load optional tasks:", err);
    }
}

async function loadGoals() {
    const goalRes = await fetch("/get-goals");
    const goals = await goalRes.json();
    const container = document.getElementById("requiredTasks");
    container.innerHTML = "";

    goals.forEach((goal, i) => {
        const li = document.createElement("li");
        li.className = "task-item";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.className = "task-checkbox good-task-checkbox";
        input.id = `task${i}`;

        const label = document.createElement("label");
        label.setAttribute("for", `task${i}`);
        label.className = "task-label";
        label.innerText = goal.goal;
        label.dataset.id = goal._id;

        li.appendChild(input);
        li.appendChild(label);
        container.appendChild(li);
    });

    goals.forEach((goal, i) => {
        const label = document.querySelectorAll("#requiredTasks .task-label")[i];
        label.textContent = goal.goal;
        label.setAttribute("data-id", goal._id);

        const streakSpan = document.createElement("span");
        streakSpan.className = "streak";
        if (goal.streak > 0) {
            streakSpan.textContent = `🔥 ${goal.streak} days`;
            if (goal.streak >= 100) {
                streakSpan.classList.add("divine-streak");
            } else if (goal.streak >= 60) {
                streakSpan.classList.add("master-streak");
            } else if (goal.streak >= 30) {
                streakSpan.classList.add("legendary-streak");
            } else if (goal.streak >= 14) {
                streakSpan.classList.add("epic-streak");
            } else if (goal.streak >= 7) {
                streakSpan.classList.add("rare-streak");
            } else if (goal.streak >= 3) {
                streakSpan.classList.add("starter-streak");
            } else {
                streakSpan.classList.add("newbie-streak");
            }
            const emoji = getStreakEmoji(goal.streak || 0);
            streakSpan.textContent = `${emoji} ${goal.streak || 0}`;
            document.querySelectorAll(".task-item")[i].appendChild(streakSpan);
        }
    });
}

// add date btns function
async function addDateBtnFnc() {
    document.querySelectorAll(".addDateBtn").forEach(button => {
        button.addEventListener("click", async (e) => {
            e.preventDefault();

            const daysToAdd = parseInt(button.textContent.replace("+", ""));
            const goalId = document.querySelector("#congratsModal").dataset.goalId;
            if (!goalId || isNaN(daysToAdd)) return;

            try {
                const res = await fetch("/add-goal-days", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ goalId, daysToAdd })
                });

                const data = await res.json();
                if (data.success) {
                    document.querySelector("#congratsModal").classList.toggle("hidden");
                } else {
                    console.error("Failed to add days:", data.message);
                }
            } catch (err) {
                console.error("Add days failed:", err);
            }
        });
    });
}

async function attachCheckboxListeners() {
    document.querySelectorAll(".task-checkbox").forEach(cb => {
        cb.addEventListener("change", async () => {
            const label = cb.nextElementSibling;
            label.classList.toggle("completed", cb.checked);

            updateProgressChart();
            saveProgressToBackend();

            if (cb.classList.contains("good-task-checkbox")) {
                const goalId = label.dataset.id;
                if (!goalId) return;

                const isIncrement = cb.checked;

                try {
                    // ✅ Update goal progress
                    const res = await fetch("/update-goal-progress", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ goalId, isIncrement })
                    });

                    const data = await res.json();

                    // ✅ Update streak in DOM immediately
                    if (typeof data.streak !== "undefined") {
                        let streakElement = label.parentElement.querySelector(".streak");
                        const streakValue = data.streak || 0;
                        const emoji = getStreakEmoji(streakValue);

                        if (streakValue > 0) {
                            if (!streakElement) {
                                streakElement = document.createElement("span");
                                streakElement.classList.add("streak");
                                label.parentElement.appendChild(streakElement);
                            }

                            // Reset and set classes
                            streakElement.className = "streak";
                            streakElement.textContent = `${emoji} ${streakValue}`;

                            if (streakValue >= 100) {
                                streakElement.classList.add("divine-streak");
                            } else if (streakValue >= 60) {
                                streakElement.classList.add("master-streak");
                            } else if (streakValue >= 30) {
                                streakElement.classList.add("legendary-streak");
                            } else if (streakValue >= 14) {
                                streakElement.classList.add("epic-streak");
                            } else if (streakValue >= 7) {
                                streakElement.classList.add("rare-streak");
                            } else if (streakValue >= 3) {
                                streakElement.classList.add("starter-streak");
                            } else {
                                streakElement.classList.add("newbie-streak");
                            }
                        } else if (streakElement) {
                            streakElement.remove();
                        }
                    }

                    // ✅ Goal completion modal
                    if (data.completed && isIncrement) {
                        const modal = document.getElementById("congratsModal");
                        const message = document.getElementById("congratsMessage");
                        message.textContent = `You completed the "${label.textContent.trim()}" goal!`;
                        modal.dataset.goalId = data.goal._id;
                        modal.classList.remove("hidden");

                        document.getElementById("deleteGoalBtn").onclick = async () => {
                            if (confirm(`Are you sure you want to delete ${data.goal.goal} goal?`)) {
                                const res = await fetch(`/goals/${data.goal._id}`, { method: "DELETE" });
                                const resData = await res.json();
                                if (resData.message) {
                                    const taskItem = label.closest(".task-item");
                                    taskItem.style.transition = "opacity 0.3s ease";
                                    taskItem.style.opacity = 0;
                                    setTimeout(() => taskItem.remove(), 300);
                                }
                            }
                            modal.classList.add("hidden");
                        };
                    }

                    // ✅ Refresh analytics if needed
                    if (document.querySelector("#goalProgressGrid")) {
                        setTimeout(() => initAnalyticsPage(), 500);
                    }

                } catch (err) {
                    console.error("Goal progress or streak update failed:", err);
                }
            }
        });
    });
}


// Create and append streak span
function getStreakEmoji(streak) {
    if (streak >= 100) return "🏆";         // Champion
    if (streak >= 50) return "🚀";          // Rocket
    if (streak >= 30) return "🔥";          // Fire
    if (streak >= 15) return "🌟";          // Star
    if (streak >= 7) return "💪";           // Muscle
    if (streak >= 3) return "✨";           // Sparkles
    if (streak >= 1) return "📅";           // Calendar
    return "🟠";                            // Starter
}
// Save data to backend
async function saveProgressToBackend() {
    const completedTasks = Array.from(document.querySelectorAll('#requiredTasks input:checked')).map(cb =>
        cb.nextElementSibling.innerText
    );
    const wrongTasks = Array.from(document.querySelectorAll('#optionalTasks input:checked')).map(cb =>
        cb.nextElementSibling.innerText
    );
    const mood = document.querySelector('.mood-btn.active')?.dataset.mood || "neutral";
    const journalEntry = document.querySelector('.journal-input')?.value || "";

    const progressData = { completedTasks, wrongTasks, mood, journalEntry };

    try {
        const res = await fetch("/save-progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(progressData)
        });
        const data = await res.json();
    } catch (err) {
        console.error("Save error:", err);
    }
}

// Load pages dynamically
async function loadSection(section) {
    try {
        const res = await fetch(`/partials/${section}`);
        const html = await res.text();
        mainContent.innerHTML = html;

        if (section === "home") {
            if (typeof Chart === "undefined") {
                const chartScript = document.createElement("script");
                chartScript.src = "https://cdn.jsdelivr.net/npm/chart.js";
                chartScript.onload = initHomePage;
                document.head.appendChild(chartScript);
            } else {
                initHomePage();
            }
        }

        if (section === "goals") {
            initGoalsPage();
        }
        if (section === "journal") {
            initJournalPage();
        }
        if (section === "analytics") {
            initAnalyticsPage();
        }

    } catch (err) {
        mainContent.innerHTML = "<p>Could not load section.</p>";
        console.error(err);
    }
}

document.querySelectorAll(".navigate-link").forEach(link => {
    link.addEventListener("click", e => {
        e.preventDefault();
        const section = link.querySelector("span").innerText.toLowerCase();
        loadSection(section);

        document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
        link.parentElement.classList.add("active");
    });
});

async function loadInitialProgress(section) {
    const res = await fetch("/get-latest-progress");
    const progress = await res.json();
    if (!progress || Object.keys(progress).length === 0) {

        if (section === "home") {
            const goalBtn = document.querySelector(".go-to-goal-page-btn");
            goalBtn.style.display = "block"
            goalBtn.addEventListener("click", async (e) => {
                e.preventDefault();
                loadSection("goals");
                document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
                Array.from(document.querySelectorAll(".goalNavBtn")).forEach(item => item.classList.add("active"));
            });
        }
        if (section === "journal") {
            const journalBtn = document.querySelector(".go-to-jouranl-page-btn");
            console.log(journalBtn);
            journalBtn.style.display = "block"
            journalBtn.addEventListener("click", async (e) => {
                e.preventDefault();
                await loadSection("home");
                document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
                Array.from(document.querySelectorAll(".homeNavBtn")).forEach(item => item.classList.add("active"));
                document.querySelector(".journal-input").focus();
            });
        }




    } else {
        // render normally
        // loadSection("home");
    }
}