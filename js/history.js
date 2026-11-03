(function () {
    "use strict";

    const $ = (id) => document.getElementById(id);
    let activities = [];

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

    function formatDate(timestamp) {
        const date = new Date(Number(timestamp));
        if (Number.isNaN(date.getTime())) return "Date unavailable";

        return new Intl.DateTimeFormat(undefined, {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(date);
    }

    function actionLabel(action) {
        const labels = {
            created: "Project created",
            updated: "Project updated",
            deleted: "Project deleted"
        };
        return labels[action] || "Project activity";
    }

    function visibleActivities() {
        const query = $("historySearch").value.trim().toLowerCase();
        const filter = $("historyFilter").value;

        return activities.filter(function (activity) {
            const project = activity.project || {};
            const matchesFilter = filter === "all" || activity.action === filter;
            const searchable = [
                actionLabel(activity.action),
                project.name,
                project.description,
                project.company,
                project.employees,
                project.tasks,
                project.status
            ].join(" ").toLowerCase();

            return matchesFilter && searchable.includes(query);
        });
    }

    function render() {
        const grid = $("historyGrid");
        const empty = $("historyEmpty");
        const resultCount = $("historyResultCount");
        const results = visibleActivities();

        grid.innerHTML = "";
        resultCount.textContent =
            results.length + (results.length === 1 ? " activity" : " activities");

        if (activities.length === 0) {
            $("historyEmptyTitle").textContent = "No activity yet";
            $("historyEmptyMessage").textContent =
                "Create, update, or delete a project to see its activity here.";
        } else if (results.length === 0) {
            $("historyEmptyTitle").textContent = "No matching activity";
            $("historyEmptyMessage").textContent =
                "Try a different search or activity type.";
        }

        empty.hidden = results.length > 0;

        results.forEach(function (activity) {
            const project = activity.project || {};
            const title = String(project.name || "Untitled project");
            const description = String(project.description || "No description provided.");
            const action = ["created", "updated", "deleted"].includes(activity.action)
                ? activity.action
                : "activity";
            const eventDate = new Date(Number(activity.timestamp));
            const eventDateISO = Number.isNaN(eventDate.getTime())
                ? ""
                : eventDate.toISOString();
            const card = document.createElement("article");
            card.className = "history-card";
            card.innerHTML = `
                <div class="history-card-heading">
                    <span class="history-event-icon" aria-hidden="true">
                        ${action === "created" ? "＋" : action === "updated" ? "↻" : action === "deleted" ? "−" : "•"}
                    </span>
                    <div>
                        <span class="history-event-type">${escapeHTML(actionLabel(action))}</span>
                        <h2>${escapeHTML(title)}</h2>
                    </div>
                </div>
                <p class="history-description">${escapeHTML(description)}</p>
                <time datetime="${escapeHTML(eventDateISO)}">
                    ${escapeHTML(formatDate(activity.timestamp))}
                </time>
                <div class="history-card-actions">
                    <button class="history-primary-btn" type="button" data-action="toggle-details">
                        View details
                    </button>
                    ${action !== "deleted"
                        ? '<a class="history-secondary-btn" href="projects.html">Go to Projects</a>'
                        : ""}
                </div>
                <div class="history-details" hidden>
                    <p><strong>Status:</strong> ${escapeHTML(project.status || "Not set")}</p>
                    <p><strong>Company:</strong> ${escapeHTML(project.company || "Not set")}</p>
                    <p><strong>Employees:</strong> ${escapeHTML(project.employees || "Not set")}</p>
                    <p><strong>Budget:</strong> ${escapeHTML(project.budget === "" || project.budget == null ? "Not set" : "$" + project.budget)}</p>
                    <p><strong>Progress:</strong> ${escapeHTML(project.progress == null ? "Not set" : project.progress + "%")}</p>
                    <p><strong>Deadline:</strong> ${escapeHTML(project.deadline || "Not set")}</p>
                    <p><strong>Tasks:</strong></p>
                    <pre>${escapeHTML(project.tasks || "No tasks added.")}</pre>
                </div>
            `;
            grid.appendChild(card);
        });

        $("clearHistory").disabled = activities.length === 0;
    }

    function refresh() {
        const result = window.SynvoraProjectActivity.load();

        if (!result.ok) {
            activities = [];
            $("historyGrid").innerHTML = "";
            $("historyResultCount").textContent = "History could not be loaded.";
            $("historyEmptyTitle").textContent = "Unable to load history";
            $("historyEmptyMessage").textContent =
                "Please check browser storage and refresh the page.";
            $("historyEmpty").hidden = false;
            $("clearHistory").disabled = true;
            console.error("Synvora History: unable to load activity.", result.error);
            return;
        }

        activities = result.events;
        render();
    }

    function handleGridClick(event) {
        const button = event.target.closest("button[data-action='toggle-details']");
        if (!button) return;

        const details = button.closest(".history-card").querySelector(".history-details");
        details.hidden = !details.hidden;
        button.textContent = details.hidden ? "View details" : "Hide details";
    }

    function clearHistory() {
        if (!activities.length) return;
        if (!window.confirm("Clear activity history? Saved projects will not be deleted.")) return;

        const result = window.SynvoraProjectActivity.clear();
        if (!result.ok) {
            console.error("Synvora History: unable to clear activity.", result.error);
            window.alert("History clear nahi ho saki. Please try again.");
            return;
        }

        refresh();
    }

    function init() {
        $("historySearch").addEventListener("input", render);
        $("historyFilter").addEventListener("change", render);
        $("refreshHistory").addEventListener("click", refresh);
        $("clearHistory").addEventListener("click", clearHistory);
        $("historyGrid").addEventListener("click", handleGridClick);
        refresh();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
