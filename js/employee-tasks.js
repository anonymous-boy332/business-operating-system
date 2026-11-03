/* =========================================================
   SYNVORA AI
   EMPLOYEE TASK ASSIGNMENT MODULE
   File: js/employee-tasks.js

   Features:
   - Assign Tasks to Employees
   - Employee Dropdown
   - Task Description
   - Priority & Due Date
   - Edit / Delete Tasks
   - Update Task Status
   - LocalStorage Saving
   - Automatic Component Detection
========================================================= */

"use strict";

(function () {

    if (window.employeeTasksModuleLoaded) return;

    window.employeeTasksModuleLoaded = true;

    const STORAGE_KEY = "synvoraEmployeeTasks";

    let editingTaskId = null;
    let initialized = false;

    console.log("Synvora AI — Employee Tasks Module Loaded");


    /* =====================================================
       HELPERS
    ===================================================== */

    function getTasks() {

        try {
            const saved = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            return Array.isArray(saved) ? saved : [];

        } catch (error) {
            console.error("Task storage error:", error);
            return [];
        }
    }


    function saveTasks(tasks) {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(tasks)
        );
        window.refreshBusinessIntelligence?.();
    }


    function createId() {

        if (
            window.crypto &&
            typeof window.crypto.randomUUID === "function"
        ) {
            return window.crypto.randomUUID();
        }

        return "TASK-" + Date.now() + "-" +
            Math.floor(Math.random() * 10000);
    }


    function escapeHTML(value) {

        return String(value ?? "").replace(
            /[&<>"']/g,
            function (character) {

                const entities = {
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"
                };

                return entities[character];
            }
        );
    }


    function getEmployees() {

        let employeeList = [];

        try {

            if (typeof employees !== "undefined" &&
                Array.isArray(employees)) {

                employeeList = employees;

            } else if (Array.isArray(window.employees)) {

                employeeList = window.employees;

            } else {

                employeeList = JSON.parse(
                    localStorage.getItem("employees") || "[]"
                );

            }

        } catch (error) {

            console.error("Unable to read employees:", error);

        }

        return Array.isArray(employeeList)
            ? employeeList.filter(function (employee) {
                return employee &&
                    employee.name &&
                    employee.status !== "Inactive";
            })
            : [];
    }


    function getEmployeeName(employeeId) {

        const employee = getEmployees().find(function (item) {
            return String(item.id) === String(employeeId);
        });

        return employee ? employee.name : "Employee unavailable";
    }


    /* =====================================================
       MODULE STYLES
    ===================================================== */

    function addTaskStyles() {

        if (document.getElementById("synvora-task-module-styles")) {
            return;
        }

        const style = document.createElement("style");

        style.id = "synvora-task-module-styles";

        style.textContent = `

            .employee-tasks .task-list {
                display: grid;
                gap: 14px;
            }

            .synvora-task-card {
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto;
                gap: 15px;
                align-items: center;
                padding: 18px;
                border: 1px solid rgba(255,255,255,.09);
                border-radius: 14px;
                background: linear-gradient(
                    135deg,
                    rgba(13,35,68,.92),
                    rgba(5,16,35,.94)
                );
            }

            .synvora-task-card h4 {
                margin: 0 0 8px;
                color: #fff;
                font-size: 15px;
            }

            .synvora-task-card p {
                margin: 5px 0;
                color: #aebed2;
                font-size: 13px;
                overflow-wrap: anywhere;
            }

            .synvora-task-description {
                color: #c4d0df !important;
            }

            .synvora-task-meta {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 12px;
            }

            .synvora-task-badge {
                display: inline-flex;
                align-items: center;
                padding: 5px 10px;
                border-radius: 20px;
                background: rgba(255,255,255,.07);
                color: #dce8f7;
                font-size: 11px;
            }

            .synvora-task-badge.high {
                color: #ff9b9b;
                background: rgba(255,75,75,.12);
            }

            .synvora-task-badge.medium {
                color: #ffd76a;
                background: rgba(255,215,0,.10);
            }

            .synvora-task-badge.low {
                color: #80d9ff;
                background: rgba(0,174,239,.12);
            }

            .synvora-task-card-actions {
                display: flex;
                flex-direction: column;
                gap: 8px;
                min-width: 125px;
            }

            .synvora-task-card-actions button,
            .synvora-task-card-actions select {
                width: 100%;
                min-height: 34px;
                border: 1px solid rgba(255,255,255,.12);
                border-radius: 8px;
                padding: 7px 9px;
                background: #102747;
                color: #fff;
                cursor: pointer;
                font-size: 12px;
            }

            .synvora-task-card-actions .task-delete-btn {
                color: #ff9b9b;
                border-color: rgba(255,90,90,.25);
            }

            .synvora-task-empty {
                padding: 25px;
                text-align: center;
                color: #aebed2;
                border: 1px dashed rgba(255,255,255,.18);
                border-radius: 12px;
            }

            .synvora-task-modal-overlay {
                position: fixed;
                inset: 0;
                z-index: 99999;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 18px;
                background: rgba(0,0,0,.76);
                backdrop-filter: blur(8px);
            }

            .synvora-task-modal-overlay.active {
                display: flex;
            }

            .synvora-task-modal {
                width: 100%;
                max-width: 560px;
                max-height: 90vh;
                overflow-y: auto;
                padding: 25px;
                border: 1px solid rgba(255,215,0,.24);
                border-radius: 18px;
                background: linear-gradient(
                    145deg,
                    #102b50,
                    #07162d 75%
                );
                box-shadow: 0 25px 80px rgba(0,0,0,.55);
            }

            .synvora-task-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 12px;
                margin-bottom: 22px;
            }

            .synvora-task-modal-header h3 {
                margin: 0;
                color: #fff;
                font-size: 20px;
            }

            .synvora-task-close {
                width: 34px;
                height: 34px;
                border: 1px solid rgba(255,255,255,.15);
                border-radius: 9px;
                background: rgba(255,255,255,.06);
                color: #fff;
                font-size: 20px;
                cursor: pointer;
            }

            .synvora-task-form {
                display: grid;
                gap: 15px;
            }

            .synvora-task-form label {
                display: grid;
                gap: 7px;
                color: #dce8f7;
                font-size: 13px;
            }

            .synvora-task-form input,
            .synvora-task-form textarea,
            .synvora-task-form select {
                width: 100%;
                box-sizing: border-box;
                min-height: 43px;
                padding: 11px 12px;
                border: 1px solid rgba(255,255,255,.14);
                border-radius: 9px;
                outline: none;
                background: rgba(3,14,30,.78);
                color: #fff;
                font: inherit;
            }

            .synvora-task-form textarea {
                min-height: 90px;
                resize: vertical;
            }

            .synvora-task-form input:focus,
            .synvora-task-form textarea:focus,
            .synvora-task-form select:focus {
                border-color: #d9b84e;
                box-shadow: 0 0 0 3px rgba(217,184,78,.10);
            }

            .synvora-task-form option {
                background: #102747;
                color: #fff;
            }

            .synvora-task-form-actions {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 5px;
            }

            .synvora-task-form-actions button {
                min-height: 42px;
                padding: 10px 18px;
                border-radius: 9px;
                cursor: pointer;
                font-weight: 600;
            }

            .synvora-task-cancel {
                border: 1px solid rgba(255,255,255,.16);
                background: transparent;
                color: #fff;
            }

            .synvora-task-save {
                border: 0;
                background: linear-gradient(135deg,#e8c65c,#b58b27);
                color: #101a2b;
            }

            @media (max-width: 600px) {

                .synvora-task-card {
                    grid-template-columns: 1fr;
                }

                .synvora-task-card-actions {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                }

                .synvora-task-modal {
                    padding: 18px;
                }

            }

        `;

        document.head.appendChild(style);
    }


    /* =====================================================
       CREATE ASSIGN TASK MODAL
    ===================================================== */

    function createTaskModal() {

        if (document.getElementById("synvoraTaskModal")) {
            return;
        }

        const overlay = document.createElement("div");

        overlay.id = "synvoraTaskModal";
        overlay.className = "synvora-task-modal-overlay";

        overlay.innerHTML = `

            <div class="synvora-task-modal">

                <div class="synvora-task-modal-header">

                    <h3 id="synvoraTaskModalTitle">
                        Assign New Task
                    </h3>

                    <button
                        type="button"
                        class="synvora-task-close"
                        data-task-close
                        aria-label="Close"
                    >×</button>

                </div>

                <form id="synvoraTaskForm" class="synvora-task-form">

                    <label>
                        Task Title

                        <input
                            type="text"
                            id="synvoraTaskTitle"
                            maxlength="120"
                            placeholder="Enter task title"
                            required
                        >
                    </label>

                    <label>
                        Assign Employee

                        <select id="synvoraTaskEmployee" required>
                            <option value="">Select Employee</option>
                        </select>
                    </label>

                    <label>
                        Task Description

                        <textarea
                            id="synvoraTaskDescription"
                            maxlength="1000"
                            placeholder="Describe the task..."
                        ></textarea>
                    </label>

                    <label>
                        Priority

                        <select id="synvoraTaskPriority" required>
                            <option value="Low">Low</option>
                            <option value="Medium" selected>Medium</option>
                            <option value="High">High</option>
                        </select>
                    </label>

                    <label>
                        Due Date

                        <input
                            type="date"
                            id="synvoraTaskDueDate"
                        >
                    </label>

                    <div class="synvora-task-form-actions">

                        <button
                            type="button"
                            class="synvora-task-cancel"
                            data-task-close
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            class="synvora-task-save"
                        >
                            Save Task
                        </button>

                    </div>

                </form>

            </div>
        `;

        document.body.appendChild(overlay);
    }


    /* =====================================================
       EMPLOYEE DROPDOWN
    ===================================================== */

    function populateEmployeeDropdown(selectedId = "") {

        const dropdown = document.getElementById(
            "synvoraTaskEmployee"
        );

        if (!dropdown) return;

        const employeeList = getEmployees();

        dropdown.innerHTML = `
            <option value="">Select Employee</option>
        `;

        employeeList.forEach(function (employee) {

            const option = document.createElement("option");

            option.value = employee.id;
            option.textContent =
                employee.name +
                (employee.department
                    ? " — " + employee.department
                    : "");

            if (String(employee.id) === String(selectedId)) {
                option.selected = true;
            }

            dropdown.appendChild(option);

        });

    }


    /* =====================================================
       OPEN / CLOSE MODAL
    ===================================================== */

    function openTaskModal(taskId = null) {

        const modal = document.getElementById("synvoraTaskModal");
        const form = document.getElementById("synvoraTaskForm");

        if (!modal || !form) return;

        editingTaskId = taskId;

        form.reset();

        const title = document.getElementById(
            "synvoraTaskModalTitle"
        );

        const saveButton = form.querySelector(
            ".synvora-task-save"
        );

        if (taskId) {

            const task = getTasks().find(function (item) {
                return item.id === taskId;
            });

            if (!task) return;

            title.textContent = "Edit Assigned Task";
            saveButton.textContent = "Update Task";

            document.getElementById("synvoraTaskTitle").value =
                task.title || "";

            document.getElementById("synvoraTaskDescription").value =
                task.description || "";

            document.getElementById("synvoraTaskPriority").value =
                task.priority || "Medium";

            document.getElementById("synvoraTaskDueDate").value =
                task.dueDate || "";

            populateEmployeeDropdown(task.employeeId);

        } else {

            title.textContent = "Assign New Task";
            saveButton.textContent = "Save Task";

            populateEmployeeDropdown();

        }

        modal.classList.add("active");

        document.getElementById("synvoraTaskTitle").focus();
    }


    function closeTaskModal() {

        const modal = document.getElementById("synvoraTaskModal");

        if (modal) {
            modal.classList.remove("active");
        }

        editingTaskId = null;
    }


    /* =====================================================
       RENDER TASK LIST
    ===================================================== */

    function renderAssignedTasks() {

        const container = document.querySelector(
            "#employee-tasks-container .task-list"
        );

        if (!container) return;

        const tasks = getTasks();

        if (!tasks.length) {

            container.innerHTML = `
                <div class="synvora-task-empty">
                    <h3>No Tasks Assigned Yet</h3>
                    <p>Click "Assign Task" to create your first task.</p>
                </div>
            `;

            return;
        }

        container.innerHTML = tasks.map(function (task) {

            const priority = String(
                task.priority || "Medium"
            ).toLowerCase();

            const status = task.status || "Pending";

            return `

                <article
                    class="synvora-task-card"
                    data-task-id="${escapeHTML(task.id)}"
                >

                    <div>

                        <h4>${escapeHTML(task.title)}</h4>

                        <p>
                            Assigned to:
                            ${escapeHTML(getEmployeeName(task.employeeId))}
                        </p>

                        ${
                            task.description
                                ? `<p class="synvora-task-description">
                                    ${escapeHTML(task.description)}
                                   </p>`
                                : ""
                        }

                        <div class="synvora-task-meta">

                            <span class="synvora-task-badge ${priority}">
                                ${escapeHTML(task.priority || "Medium")} Priority
                            </span>

                            <span class="synvora-task-badge">
                                Due: ${escapeHTML(task.dueDate || "Not set")}
                            </span>

                        </div>

                    </div>

                    <div class="synvora-task-card-actions">

                        <select
                            class="synvora-task-status"
                            aria-label="Update task status"
                        >

                            <option value="Pending" ${status === "Pending" ? "selected" : ""}>
                                Pending
                            </option>

                            <option value="In Progress" ${status === "In Progress" ? "selected" : ""}>
                                In Progress
                            </option>

                            <option value="Completed" ${status === "Completed" ? "selected" : ""}>
                                Completed
                            </option>

                        </select>

                        <button
                            type="button"
                            class="task-edit-btn"
                            data-task-edit="${escapeHTML(task.id)}"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            class="task-delete-btn"
                            data-task-delete="${escapeHTML(task.id)}"
                        >
                            Delete
                        </button>

                    </div>

                </article>

            `;

        }).join("");

    }


    /* =====================================================
       SAVE TASK
    ===================================================== */

    function handleTaskSubmit(event) {

        event.preventDefault();

        const title = document.getElementById(
            "synvoraTaskTitle"
        ).value.trim();

        const employeeId = document.getElementById(
            "synvoraTaskEmployee"
        ).value;

        const description = document.getElementById(
            "synvoraTaskDescription"
        ).value.trim();

        const priority = document.getElementById(
            "synvoraTaskPriority"
        ).value;

        const dueDate = document.getElementById(
            "synvoraTaskDueDate"
        ).value;

        if (!title || !employeeId) {

            alert("Please enter task title and select an employee.");
            return;
        }

        const selectedEmployee = getEmployees().find(function (employee) {
            return String(employee.id) === String(employeeId);
        });

        if (!selectedEmployee) {

            alert("Selected employee could not be found.");
            return;
        }

        const tasks = getTasks();

        if (editingTaskId) {

            const index = tasks.findIndex(function (task) {
                return task.id === editingTaskId;
            });

            if (index === -1) return;

            tasks[index] = {
                ...tasks[index],
                title: title,
                employeeId: employeeId,
                description: description,
                priority: priority,
                dueDate: dueDate,
                updatedAt: new Date().toISOString()
            };

        } else {

            tasks.unshift({

                id: createId(),
                title: title,
                employeeId: employeeId,
                description: description,
                priority: priority,
                dueDate: dueDate,
                status: "Pending",
                createdAt: new Date().toISOString()

            });

        }

        saveTasks(tasks);
        renderAssignedTasks();
        closeTaskModal();

    }


    /* =====================================================
       TASK STATUS UPDATE
    ===================================================== */

    function updateTaskStatus(taskId, newStatus) {

        const allowedStatuses = [
            "Pending",
            "In Progress",
            "Completed"
        ];

        if (!allowedStatuses.includes(newStatus)) return;

        const tasks = getTasks();

        const task = tasks.find(function (item) {
            return item.id === taskId;
        });

        if (!task) return;

        task.status = newStatus;
        task.updatedAt = new Date().toISOString();

        saveTasks(tasks);
        renderAssignedTasks();
    }


    /* =====================================================
       DELETE TASK
    ===================================================== */

    function deleteTask(taskId) {

        const confirmed = window.confirm(
            "Are you sure you want to delete this task?"
        );

        if (!confirmed) return;

        const tasks = getTasks().filter(function (task) {
            return task.id !== taskId;
        });

        saveTasks(tasks);
        renderAssignedTasks();
    }


    /* =====================================================
       MIGRATE EXISTING SAMPLE TASKS
       Only runs once if no saved tasks exist.
    ===================================================== */

    function migrateSampleTasks() {

        if (localStorage.getItem(STORAGE_KEY)) return;

        const oldItems = document.querySelectorAll(
            "#employee-tasks-container .task-list .task-item"
        );

        if (!oldItems.length) return;

        const employeeList = getEmployees();
        const migratedTasks = [];

        oldItems.forEach(function (item) {

            const taskTitle = item.querySelector("h4");
            const assignedText = item.querySelector("p");
            const statusElement = item.querySelector(".status");

            if (!taskTitle || !assignedText) return;

            const employeeName = assignedText.textContent
                .replace("Assigned to:", "")
                .trim();

            const employee = employeeList.find(function (person) {
                return person.name.toLowerCase() ===
                    employeeName.toLowerCase();
            });

            if (!employee) return;

            let status = "Pending";

            const statusText = statusElement
                ? statusElement.textContent.trim().toLowerCase()
                : "";

            if (statusText.includes("progress")) {
                status = "In Progress";
            } else if (statusText.includes("completed")) {
                status = "Completed";
            }

            migratedTasks.push({

                id: createId(),
                title: taskTitle.textContent.trim(),
                employeeId: employee.id,
                description: "",
                priority: "Medium",
                dueDate: "",
                status: status,
                createdAt: new Date().toISOString()

            });

        });

        if (migratedTasks.length) {
            saveTasks(migratedTasks);
        }

    }


    /* =====================================================
       EVENT LISTENERS
    ===================================================== */

    function registerTaskEvents() {

        const container = document.getElementById(
            "employee-tasks-container"
        );

        if (!container || container.dataset.taskEventsReady === "true") {
            return;
        }

        container.dataset.taskEventsReady = "true";

        container.addEventListener("click", function (event) {

            const assignButton = event.target.closest(
                ".employee-tasks .section-header .primary-btn"
            );

            if (assignButton) {
                event.preventDefault();
                openTaskModal();
                return;
            }

            const editButton = event.target.closest(
                "[data-task-edit]"
            );

            if (editButton) {
                openTaskModal(editButton.dataset.taskEdit);
                return;
            }

            const deleteButton = event.target.closest(
                "[data-task-delete]"
            );

            if (deleteButton) {
                deleteTask(deleteButton.dataset.taskDelete);
            }

        });

        container.addEventListener("change", function (event) {

            if (!event.target.matches(".synvora-task-status")) {
                return;
            }

            const card = event.target.closest("[data-task-id]");

            if (!card) return;

            updateTaskStatus(
                card.dataset.taskId,
                event.target.value
            );

        });

        const modal = document.getElementById("synvoraTaskModal");

        modal.addEventListener("click", function (event) {

            if (
                event.target === modal ||
                event.target.closest("[data-task-close]")
            ) {
                closeTaskModal();
            }

        });

        document.getElementById("synvoraTaskForm")
            .addEventListener("submit", handleTaskSubmit);

        document.addEventListener("keydown", function (event) {

            if (
                event.key === "Escape" &&
                modal.classList.contains("active")
            ) {
                closeTaskModal();
            }

        });

    }


    /* =====================================================
       INITIALIZE MODULE
    ===================================================== */

    function initializeEmployeeTasks() {

        const container = document.getElementById(
            "employee-tasks-container"
        );

        if (!container) return;

        const section = container.querySelector(".employee-tasks");

        if (!section) return;

        if (section.dataset.taskModuleReady === "true") {
            return;
        }

        section.dataset.taskModuleReady = "true";

        addTaskStyles();
        createTaskModal();

        migrateSampleTasks();

        registerTaskEvents();
        renderAssignedTasks();

        initialized = true;

        console.log(
            "Synvora AI — Employee Task Assignment Initialized"
        );

    }


    /* =====================================================
       WATCH ASYNC COMPONENT LOADING
    ===================================================== */

    function watchTaskComponent() {

        const container = document.getElementById(
            "employee-tasks-container"
        );

        if (!container) {
            console.error(
                "Employee Tasks container not found."
            );
            return;
        }

        initializeEmployeeTasks();

        const observer = new MutationObserver(function () {

            initializeEmployeeTasks();

        });

        observer.observe(container, {
            childList: true,
            subtree: true
        });

    }


    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            watchTaskComponent
        );

    } else {

        watchTaskComponent();

    }


    /* =====================================================
       PUBLIC REFRESH FUNCTION
    ===================================================== */

    window.refreshEmployeeTasks = function () {

        if (initialized) {
            renderAssignedTasks();
        }

    };

})();