
const API_URL = "/api/tasks";

const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const addButton = document.getElementById("add-button");
const taskList = document.getElementById("task-list");
const message = document.getElementById("message");

let tasks = [];
let currentFilter = "all";
let messageTimer;

function showMessage(text, error = false) {
    clearTimeout(messageTimer);
    message.textContent = text;
    message.classList.toggle("error", error);

    if (text) {
        messageTimer = setTimeout(() => {
            message.textContent = "";
        }, 4000);
    }
}

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    if (!response.ok) {
        let detail = `HTTP ${response.status}`;

        try {
            const data = await response.json();
            if (data.detail) {
                detail = Array.isArray(data.detail)
                    ? data.detail.map(item => item.msg).join(", ")
                    : data.detail;
            }
        } catch (_) {}

        throw new Error(detail);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

function getVisibleTasks() {
    if (currentFilter === "active") {
        return tasks.filter(task => !task.completed);
    }

    if (currentFilter === "completed") {
        return tasks.filter(task => task.completed);
    }

    return tasks;
}

function renderTasks() {
    taskList.replaceChildren();

    const visibleTasks = getVisibleTasks();
    const completed = tasks.filter(task => task.completed).length;
    const active = tasks.length - completed;

    document.getElementById("total-count").textContent = tasks.length;
    document.getElementById("active-count").textContent = active;
    document.getElementById("completed-count").textContent = completed;

    document.getElementById("nav-all").textContent = tasks.length;
    document.getElementById("nav-active").textContent = active;
    document.getElementById("nav-completed").textContent = completed;

    document.getElementById("heading-count").textContent =
        visibleTasks.length;

    const percentage = tasks.length
        ? Math.round((completed / tasks.length) * 100)
        : 0;

    document.getElementById("progress-bar").style.width =
        `${percentage}%`;

    document.getElementById("progress-copy").textContent =
        tasks.length
            ? `${percentage}% of your tasks complete`
            : "Your progress starts here";

    document.getElementById("remaining-label").textContent =
        `${active} task${active === 1 ? "" : "s"} remaining`;

    const headings = {
        all: "All tasks",
        active: "In progress",
        completed: "Completed"
    };

    document.getElementById("heading-title").textContent =
        headings[currentFilter];

    document.getElementById("list-caption").textContent = {
        all: "YOUR CHECKLIST",
        active: "STILL TO DO",
        completed: "LOOK WHAT YOU DID"
    }[currentFilter];

    const emptyMessage = document.getElementById("empty-message");
    emptyMessage.hidden = visibleTasks.length > 0;

    if (visibleTasks.length === 0) {
        const title = emptyMessage.querySelector("h3");
        const description = emptyMessage.querySelector("p");

        if (currentFilter === "active" && tasks.length > 0) {
            title.textContent = "All caught up.";
            description.textContent =
                "Every task is complete. Enjoy your progress.";
        } else if (currentFilter === "completed" && tasks.length > 0) {
            title.textContent = "Your next win is waiting.";
            description.textContent =
                "Complete a task and it will appear here.";
        } else {
            title.textContent = "A fresh start.";
            description.textContent =
                "Your list is clear. Add a task above and make today count.";
        }
    }

    visibleTasks.forEach(task => {
        const item = document.createElement("li");
        item.className = "task-item";

        if (task.completed) {
            item.classList.add("completed");
        }

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "task-checkbox";
        checkbox.checked = Boolean(task.completed);
        checkbox.setAttribute(
            "aria-label",
            `Mark ${task.title} as completed`
        );

        checkbox.addEventListener("change", () => {
            updateTask(task.id, checkbox.checked);
        });

        const title = document.createElement("span");
        title.className = "task-title";
        title.textContent = task.title;

        const tag = document.createElement("span");
        tag.className = "task-tag";
        tag.textContent = task.completed ? "Done" : "To do";

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-button";
        deleteButton.textContent = "×";
        deleteButton.title = "Delete task";
        deleteButton.setAttribute(
            "aria-label",
            `Delete ${task.title}`
        );

        deleteButton.addEventListener("click", () => {
            deleteTask(task.id);
        });

        item.append(checkbox, title, tag, deleteButton);
        taskList.appendChild(item);
    });

    document.querySelectorAll(".nav-item").forEach(button => {
        const selected = button.dataset.filter === currentFilter;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", String(selected));
    });
}

async function loadTasks() {
    try {
        const result = await apiRequest(API_URL);
        tasks = Array.isArray(result) ? result : [];
        renderTasks();
    } catch (error) {
        showMessage(
            `Could not load tasks: ${error.message}. Check the backend.`,
            true
        );
        console.error("Load tasks error:", error);
    }
}

taskForm.addEventListener("submit", async event => {
    event.preventDefault();

    const title = taskInput.value.trim();

    if (!title) {
        showMessage("Please enter a task.", true);
        taskInput.focus();
        return;
    }

    addButton.disabled = true;

    try {
        const newTask = await apiRequest(API_URL, {
            method: "POST",
            body: JSON.stringify({ title })
        });

        tasks.unshift(newTask);
        currentFilter = "all";

        taskInput.value = "";
        renderTasks();
        showMessage("Task added successfully!");

        taskInput.focus();
    } catch (error) {
        showMessage(
            `Could not add task: ${error.message}`,
            true
        );
        console.error("Add task error:", error);
    } finally {
        addButton.disabled = false;
    }
});

async function updateTask(id, completed) {
    try {
        const updatedTask = await apiRequest(
            `${API_URL}/${id}`,
            {
                method: "PATCH",
                body: JSON.stringify({ completed })
            }
        );

        tasks = tasks.map(task =>
            task.id === id ? updatedTask : task
        );

        renderTasks();

        showMessage(
            completed
                ? "Great job! Task completed."
                : "Task marked as incomplete."
        );
    } catch (error) {
        showMessage(`Could not update task: ${error.message}`, true);
        await loadTasks();
    }
}

async function deleteTask(id) {
    try {
        await apiRequest(`${API_URL}/${id}`, {
            method: "DELETE"
        });

        tasks = tasks.filter(task => task.id !== id);
        renderTasks();
        showMessage("Task deleted successfully!");
    } catch (error) {
        showMessage(`Could not delete task: ${error.message}`, true);
        console.error("Delete task error:", error);
    }
}

document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;
        renderTasks();
    });
});

function setDate() {
    const now = new Date();

    document.getElementById("date-label").textContent =
        new Intl.DateTimeFormat("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short"
        }).format(now);

    document.getElementById("today-label").textContent =
        new Intl.DateTimeFormat("en-IN", {
            weekday: "long"
        }).format(now).toUpperCase() + " • YOUR DAY, YOUR PACE";
}

setDate();
loadTasks();
