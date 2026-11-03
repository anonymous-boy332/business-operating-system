function setSidebarOpen(isOpen) {
    const sidebar = document.querySelector(".ai-sidebar");
    const overlay = document.querySelector(".sidebar-overlay");
    const toggleButton = document.querySelector(".menu-toggle");

    if (!sidebar) return;

    if (window.innerWidth <= 768) {
        sidebar.classList.toggle("active", isOpen);
        overlay?.classList.toggle("active", isOpen);
        document.body.classList.toggle("sidebar-mobile-open", isOpen);
    } else {
        sidebar.classList.remove("active");
        overlay?.classList.remove("active");
        document.body.classList.remove("sidebar-mobile-open");
        document.body.classList.toggle("sidebar-collapsed", !isOpen);
    }

    toggleButton?.setAttribute("aria-expanded", String(isOpen));
}

window.toggleSidebar = function () {
    const sidebar = document.querySelector(".ai-sidebar");

    if (!sidebar) return;

    if (window.innerWidth <= 768) {
        setSidebarOpen(!sidebar.classList.contains("active"));
    } else {
        setSidebarOpen(
            document.body.classList.contains("sidebar-collapsed")
        );
    }
};

/* Mobile par navigation link select ho to menu band */
document.addEventListener("click", function (event) {
    if (
        window.innerWidth <= 768 &&
        event.target instanceof Element &&
        event.target.closest(".ai-sidebar a")
    ) {
        setSidebarOpen(false);
    }
});

/* Overlay ya Escape se mobile menu band */
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        setSidebarOpen(false);
    }
});

/* Mobile/desktop size change par sidebar state reset */
let previousMobileState = window.innerWidth <= 768;

window.addEventListener("resize", function () {
    const currentMobileState = window.innerWidth <= 768;

    if (currentMobileState !== previousMobileState) {
        document.querySelector(".ai-sidebar")?.classList.remove("active");
        document.querySelector(".sidebar-overlay")?.classList.remove("active");
        document.body.classList.remove(
            "sidebar-mobile-open",
            "sidebar-collapsed"
        );
        document.querySelector(".menu-toggle")?.setAttribute("aria-expanded", "false");

        previousMobileState = currentMobileState;
    }
});