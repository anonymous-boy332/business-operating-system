
/* =====================================================
   SYNVORA AI — PROJECTS MANAGER
   Frontend only — localStorage
   Does not modify other modules
===================================================== */

(function () {
    "use strict";

    const STORAGE_KEY = "synvoraProjectsV1";

    let projects = [];
    let editingProjectId = null;
    let returnFocusElement = null;

    const $ = (id) => document.getElementById(id);

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (char) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[char];
        });
    }

    function readProjects() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);

            if (!stored) return [];

            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error("Synvora Projects: unable to read saved projects.", error);
            return [];
        }
    }

    function saveProjects() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
            return true;
        } catch (error) {
            console.error("Synvora Projects: unable to save projects.", error);
            alert("Projects save nahi ho sake. Browser storage full ya unavailable ho sakti hai.");
            return false;
        }
    }

    function statusLabel(status) {
        const labels = {
            planned: "Planned",
            "in-progress": "In Progress",
            "on-hold": "On Hold",
            completed: "Completed"
        };

        return labels[status] || "Planned";
    }

    function formatDate(dateValue) {
        if (!dateValue) return "Not set";

        const date = new Date(dateValue + "T00:00:00");

        if (Number.isNaN(date.getTime())) return "Not set";

        return date.toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }

    function formatBudget(value) {
        if (value === "" || value === null || value === undefined) {
            return "Not set";
        }

        const amount = Number(value);

        if (!Number.isFinite(amount)) return "Not set";

        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 2
        }).format(amount);
    }

    function getFilteredProjects() {
        const search = $("projectSearch").value.trim().toLowerCase();
        const status = $("projectStatusFilter").value;
        const sort = $("projectSort").value;

        let result = projects.filter(function (project) {
            const statusMatches =
                status === "all" ||
                project.status === status;

            const searchableText = [
                project.name,
                project.description,
                project.company,
                project.employees,
                project.tasks
            ].join(" ").toLowerCase();

            const searchMatches = searchableText.includes(search);

            return statusMatches && searchMatches;
        });

        result.sort(function (a, b) {
            if (sort === "name") {
                return String(a.name).localeCompare(String(b.name));
            }

            if (sort === "deadline") {
                if (!a.deadline) return 1;
                if (!b.deadline) return -1;
                return a.deadline.localeCompare(b.deadline);
            }

            return Number(b.updatedAt || 0) - Number(a.updatedAt || 0);
        });

        return result;
    }

    function renderStats() {
        $("totalProjects").textContent = projects.length;

        $("activeProjects").textContent = projects.filter(
            p => p.status !== "completed"
        ).length;

        $("completedProjects").textContent = projects.filter(
            p => p.status === "completed"
        ).length;
    }

    function renderProjects() {
        const grid = $("projectsGrid");
        const emptyState = $("projectsEmptyState");
        const results = getFilteredProjects();

        $("projectResultCount").textContent =
            results.length + (results.length === 1 ? " project" : " projects");

        grid.innerHTML = "";

        if (results.length === 0) {
            emptyState.hidden = false;

            if (projects.length === 0) {
                $("emptyStateTitle").textContent = "Start your project journey";
                $("emptyStateText").textContent =
                    "Create your first business project to get started.";
            } else {
                $("emptyStateTitle").textContent = "No matching projects";
                $("emptyStateText").textContent =
                    "Try another search or status filter.";
            }

            return;
        }

        emptyState.hidden = true;

        results.forEach(function (project) {
            const card = document.createElement("article");
            card.className = "project-item";

            const tasks = String(project.tasks || "")
                .split("\n")
                .map(task => task.trim())
                .filter(Boolean);

            const detailRows = [
                ["Company", project.company || "Not assigned"],
                ["Employees", project.employees || "Not assigned"],
                ["Budget", formatBudget(project.budget)],
                ["Deadline", formatDate(project.deadline)],
                ["Tasks", String(tasks.length)]
            ];

            const detailHTML = detailRows.map(function (row) {
                return `
                    <div class="project-meta-row">
                        <span>${escapeHTML(row[0])}</span>
                        <strong>${escapeHTML(row[1])}</strong>
                    </div>
                `;
            }).join("");

            const progress = Math.min(
                100,
                Math.max(0, Number(project.progress) || 0)
            );

            card.innerHTML = `
                <div class="project-card-top">
                    <div class="project-icon">🏢</div>

                    <span class="project-category-badge business">
                        Business OS
                    </span>
                </div>

                <div class="project-card-title-row">
                    <h3 class="project-card-title">${escapeHTML(project.name)}</h3>
                    <span class="project-priority-badge ${escapeHTML(project.priority || "medium")}">
                        ${escapeHTML(project.priority || "medium")}
                    </span>
                </div>

                <p class="project-card-description">
                    ${escapeHTML(project.description || "No description added yet.")}
                </p>

                <div class="project-meta-list">
                    ${detailHTML}
                    <div class="project-meta-row">
                        <span>Status</span>
                        <strong>
                            <span class="project-status-badge ${escapeHTML(project.status)}">
                                ${escapeHTML(statusLabel(project.status))}
                            </span>
                        </strong>
                    </div>
                </div>

                <div class="project-progress-head">
                    <span>Project Progress</span>
                    <strong>${progress}%</strong>
                </div>

                <div class="project-progress-track">
                    <div class="project-progress-fill" style="width:${progress}%"></div>
                </div>

                <div class="project-card-actions">
                    <button class="project-action-btn" type="button"
                        data-action="edit" data-id="${escapeHTML(project.id)}">
                        Edit
                    </button>

                    <button class="project-action-btn delete" type="button"
                        data-action="delete" data-id="${escapeHTML(project.id)}">
                        Delete
                    </button>
                </div>
            `;

            grid.appendChild(card);
        });
    }

    function render() {
        renderStats();
        renderProjects();
    }

    function openModal(project) {
        returnFocusElement = document.activeElement;
        $("projectForm").reset();
        $("projectFormError").textContent = "";
        editingProjectId = project ? project.id : null;

        $("projectModalTitle").textContent = project
            ? "Edit Project"
            : "Create New Project";

        $("saveProjectBtn").textContent = project
            ? "Save Changes"
            : "Save Project";

        $("projectId").value = project ? project.id : "";
        $("projectName").value = project ? project.name : "";
        $("projectStatus").value = project ? project.status : "planned";
        $("projectDescription").value = project ? project.description || "" : "";
        $("projectCompany").value = project ? project.company || "" : "";
        $("projectEmployees").value = project ? project.employees || "" : "";
        $("projectBudget").value = project && project.budget !== "" ? project.budget : "";
        $("projectDeadline").value = project ? project.deadline || "" : "";
        $("projectProgress").value = project ? project.progress ?? 0 : 0;
        $("projectPriority").value = project ? project.priority || "medium" : "medium";
        $("projectTasks").value = project ? project.tasks || "" : "";

        $("projectModal").classList.add("open");
        $("projectModal").setAttribute("aria-hidden", "false");
        document.body.classList.add("project-modal-open");
        $("projectName").focus();
    }

    function closeModal(focusTarget) {
        $("projectModal").classList.remove("open");
        $("projectModal").setAttribute("aria-hidden", "true");
        document.body.classList.remove("project-modal-open");
        $("projectForm").reset();
        $("projectFormError").textContent = "";
        $("projectModalTitle").textContent = "Create New Project";
        $("saveProjectBtn").textContent = "Save Project";
        $("projectId").value = "";

        editingProjectId = null;

        const elementToFocus = focusTarget || returnFocusElement;
        if (elementToFocus && elementToFocus.isConnected) {
            elementToFocus.focus();
        }
        returnFocusElement = null;
    }


    function handleSubmit(event) {
        event.preventDefault();

        const name = $("projectName").value.trim();

        if (!name) {
            $("projectFormError").textContent = "Project name required hai.";
            $("projectName").focus();
            return;
        }

        const rawBudget = $("projectBudget").value;
        const budget = rawBudget === "" ? "" : Number(rawBudget);
        const progressInput = Number($("projectProgress").value);

        if (rawBudget !== "" &&
            (!Number.isFinite(budget) || budget < 0)) {
            $("projectFormError").textContent = "Budget zero ya positive amount hona chahiye.";
            return;
        }

        if (!Number.isFinite(progressInput) || progressInput < 0 || progressInput > 100) {
            $("projectFormError").textContent = "Progress 0 se 100 ke darmiyan honi chahiye.";
            return;
        }

        let status = $("projectStatus").value;
        let progress = Math.round(progressInput);

        if (status === "completed") {
            progress = 100;
        } else if (progress === 100) {
            status = "completed";
        }

        const existing = editingProjectId
            ? projects.find(p => p.id === editingProjectId)
            : null;

        const project = {
            id: editingProjectId || (
                "synvora-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8)
            ),
            name: name,
            category: "business",
            description: $("projectDescription").value.trim(),
            status: status,
            progress: progress,
            priority: $("projectPriority").value,
            company: $("projectCompany").value.trim(),
            employees: $("projectEmployees").value.trim(),
            budget: budget,
            deadline: $("projectDeadline").value,
            tasks: $("projectTasks").value.trim(),
            createdAt: existing ? existing.createdAt : Date.now(),
            updatedAt: Date.now()
        };

        if (editingProjectId) {
            projects = projects.map(p => p.id === editingProjectId ? project : p);
        } else {
            projects.unshift(project);
        }

        if (!saveProjects()) {
            return;
        }

        const activityResult = window.SynvoraProjectActivity.record(
            existing ? "updated" : "created",
            project
        );
        if (!activityResult.ok) {
            alert("Project save ho gaya, lekin History update nahi ho saki.");
        }

        $("projectSearch").value = "";
        $("projectStatusFilter").value = "all";
        $("projectSort").value = "updated";

        render();
        closeModal($("openProjectModal"));
    }

    function handleProjectAction(event) {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const project = projects.find(p => p.id === button.dataset.id);
        if (!project) return;

        if (button.dataset.action === "edit") {
            openModal(project);
            return;
        }

        if (button.dataset.action === "delete") {
            const confirmed = window.confirm(
                'Delete "' + project.name + '"? This cannot be undone.'
            );

            if (!confirmed) return;

            const previousProjects = projects;
            projects = projects.filter(p => p.id !== project.id);

            if (!saveProjects()) {
                projects = previousProjects;
                return;
            }

            const activityResult = window.SynvoraProjectActivity.record("deleted", project);
            if (!activityResult.ok) {
                alert("Project delete ho gaya, lekin History update nahi ho saki.");
            }

            render();
            $("openProjectModal").focus();
        }
    }

    function init() {
        projects = readProjects();

        $("openProjectModal").addEventListener("click", () => openModal(null));
        $("emptyCreateProject").addEventListener("click", () => openModal(null));
        $("projectForm").addEventListener("submit", handleSubmit);
        $("projectsGrid").addEventListener("click", handleProjectAction);

        $("projectSearch").addEventListener("input", renderProjects);
        $("projectStatusFilter").addEventListener("change", renderProjects);
        $("projectSort").addEventListener("change", renderProjects);

        document.querySelectorAll("[data-close-modal]").forEach(function (element) {
            element.addEventListener("click", closeModal);
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && $("projectModal").classList.contains("open")) {
                closeModal();
            }
        });

        render();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
