(function () {
    "use strict";

    const ACTIVITY_KEY = "synvoraProjectActivityV1";
    const PROJECTS_KEY = "synvoraProjectsV1";

    function readEvents() {
        const stored = localStorage.getItem(ACTIVITY_KEY);
        if (stored === null) return [];

        const events = JSON.parse(stored);
        if (!Array.isArray(events)) {
            throw new Error("Saved project activity is not a valid list.");
        }
        if (events.some(event => !event || typeof event !== "object" || !event.project)) {
            throw new Error("Saved project activity contains an invalid entry.");
        }

        return events;
    }

    function saveEvents(events) {
        localStorage.setItem(ACTIVITY_KEY, JSON.stringify(events));
    }

    function record(action, project) {
        try {
            const events = readEvents();
            events.unshift({
                id: "activity-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
                action: action,
                project: JSON.parse(JSON.stringify(project)),
                timestamp: Date.now()
            });
            saveEvents(events);
            return { ok: true };
        } catch (error) {
            console.error("Synvora History: unable to save project activity.", error);
            return { ok: false, error: error };
        }
    }

    function load() {
        try {
            if (localStorage.getItem(ACTIVITY_KEY) === null) {
                const storedProjects = localStorage.getItem(PROJECTS_KEY);
                const projects = storedProjects ? JSON.parse(storedProjects) : [];

                if (!Array.isArray(projects)) {
                    throw new Error("Saved projects are not a valid list.");
                }

                const initialEvents = projects.map(function (project) {
                    return {
                        id: "legacy-" + String(project.id),
                        action: "created",
                        project: project,
                        timestamp: Number(project.createdAt || project.updatedAt) || Date.now()
                    };
                });

                saveEvents(initialEvents);
            }

            return { ok: true, events: readEvents() };
        } catch (error) {
            console.error("Synvora History: unable to load project activity.", error);
            return { ok: false, error: error, events: [] };
        }
    }

    function clear() {
        try {
            saveEvents([]);
            return { ok: true };
        } catch (error) {
            console.error("Synvora History: unable to clear project activity.", error);
            return { ok: false, error: error };
        }
    }

    window.SynvoraProjectActivity = {
        load: load,
        record: record,
        clear: clear
    };
})();
