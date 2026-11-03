/* =========================================================
   SYNVORA AI
   OWNER DASHBOARD — CENTRAL BUTTON MANAGER

   File: js/owner-dashboard-buttons.js

   Owner Dashboard actions yahan manage honge.

   IMPORTANT:
   CRM ke internal buttons aur Employee Attendance
   handlers js/buttons.js mein hi rahenge.
========================================================= */

"use strict";

(function () {

    if (window.ownerDashboardButtonsInitialized) {
        console.warn(
            "Owner Dashboard Button Manager already initialized."
        );
        return;
    }

    window.ownerDashboardButtonsInitialized = true;

    console.log(
        "Synvora AI — Owner Dashboard Button Manager Loaded"
    );


    /* =====================================================
       FIND MODULE CONTAINER
    ===================================================== */

    function ownerFindTarget(containerId) {

        const target = document.getElementById(containerId);

        if (!target) {

            console.error(
                "[Owner Dashboard] Container not found:",
                containerId
            );

            return null;
        }

        return target;
    }


    /* =====================================================
       OPEN BUSINESS OPERATIONS SECTION
    ===================================================== */

    function ownerShowSection(containerId) {

        const target = ownerFindTarget(containerId);

        if (!target) {
            return false;
        }

        target.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        console.log(
            "[Owner Dashboard] Section opened:",
            containerId
        );

        return true;
    }

    function ownerNavigate(moduleName, containerId) {
        if (typeof window.showBusinessOSModule !== "function") {
            console.error("[Owner Dashboard] Business OS module navigation is unavailable.");
            return false;
        }

        const target = document.getElementById(containerId);
        if (!target) {
            console.error("[Owner Dashboard] Container not found:", containerId);
            return false;
        }

        window.showBusinessOSModule(moduleName);
        const nestedModule = target.closest("[data-business-module]");
        if (nestedModule && nestedModule.dataset.businessModule !== moduleName) {
            nestedModule.hidden = false;
            nestedModule.style.removeProperty("display");
        }
        requestAnimationFrame(function () {
            ownerShowSection(containerId);
        });
        return true;
    }


    /* =====================================================
       1. BUSINESS DASHBOARD
    ===================================================== */

    function openBusinessDashboard() {

        return ownerNavigate(
            "insights",
            "business-overview-container"
        );
    }


    /* =====================================================
       2. FINANCE
    ===================================================== */

    function openFinanceDashboard() {

        return ownerNavigate(
            "finance",
            "finance-dashboard-container"
        );
    }


    /* =====================================================
       3. CRM
    ===================================================== */

    function openCRMManagement() {

        return ownerNavigate(
            "crm",
            "crm-management-container"
        );
    }


    /* =====================================================
       4. INVENTORY
    ===================================================== */

    function openInventoryManagement() {

        return ownerNavigate(
            "inventory",
            "inventory-table-container"
        );
    }


    /* =====================================================
       5. SALES
    ===================================================== */

    function openSalesDashboard() {

        return ownerNavigate(
            "crm",
            "sales-dashboard-container"
        );
    }


    /* =====================================================
       6. EMPLOYEE MANAGEMENT
    ===================================================== */

    function openEmployeeManagement() {

        return ownerNavigate(
            "team",
            "employee-management-container"
        );
    }


    /* =====================================================
       7. AI BUSINESS ADVISOR
    ===================================================== */

    function openAIAdvisor() {

        const opened = ownerNavigate(
            "insights",
            "ai-advisor-dashboard-container"
        );

        if (opened) {
            const askButton = document.getElementById(
                "askBusinessAdvisorBtn"
            );

            if (askButton) {
                askButton.focus({
                    preventScroll: true
                });
            }

        }

        return opened;
    }


    /* =====================================================
       8. REPORTS
    ===================================================== */

    function openReportsDashboard() {

        return ownerNavigate(
            "insights",
            "reports-dashboard-container"
        );
    }

    function openOwnerBusinessIntelligence() {
        return ownerNavigate(
            "insights",
            "business-stats-container"
        );
    }


    /* =====================================================
       9. SETTINGS
    ===================================================== */

    function openBusinessSettings() {

        return ownerNavigate(
            "overview",
            "settings-container"
        );
    }


    /* =====================================================
       10. INVOICE MANAGEMENT
    ===================================================== */

    function openInvoiceManagement() {

        return ownerNavigate(
            "finance",
            "invoice-management-container"
        );
    }


    /* =====================================================
       CENTRAL ACTION REGISTRY
    ===================================================== */

    const ownerDashboardActions = {

        "business-dashboard": openBusinessDashboard,

        "finance": openFinanceDashboard,

        "crm": openCRMManagement,

        "inventory": openInventoryManagement,

        "sales": openSalesDashboard,

        "employees": openEmployeeManagement,

        "ai-advisor": openAIAdvisor,

        "reports": openReportsDashboard,

        "business-intelligence": openOwnerBusinessIntelligence,

        "settings": openBusinessSettings,

        "invoices": openInvoiceManagement,

        "companies": function () {

            return ownerNavigate(
                "overview",
                "company-management-container"
            );

        }

    };


    /* =====================================================
       CENTRAL CLICK HANDLER

       Dynamically loaded HTML cards bhi supported hain.
    ===================================================== */

    document.addEventListener("click", function (event) {

        if (!(event.target instanceof Element)) {
            return;
        }

        const button = event.target.closest(
            "[data-owner-action]"
        );

        if (!button) {
            return;
        }

        const action = button.dataset.ownerAction;

        const handler = ownerDashboardActions[action];

        if (typeof handler !== "function") {

            console.error(
                "[Owner Dashboard] Unknown action:",
                action
            );

            return;
        }

        if (
            button.matches(":disabled") ||
            button.getAttribute("aria-disabled") === "true"
        ) {
            return;
        }

        event.preventDefault();

        handler();

    });


    /* =====================================================
       PUBLIC FUNCTIONS

       Existing onclick attributes ki compatibility.
    ===================================================== */

    window.openBusinessDashboard =
        openBusinessDashboard;

    window.openFinanceDashboard =
        openFinanceDashboard;

    window.openCRMManagement =
        openCRMManagement;

    window.openInventoryManagement =
        openInventoryManagement;

    window.openSalesDashboard =
        openSalesDashboard;

    window.openEmployeeManagement =
        openEmployeeManagement;

    window.openAIAdvisor =
        openAIAdvisor;

    window.openReportsDashboard =
        openReportsDashboard;

    window.openOwnerBusinessIntelligence =
        openOwnerBusinessIntelligence;

    window.openCompanyManagement =
        ownerDashboardActions.companies;

    window.openBusinessSettings =
        openBusinessSettings;

    window.openInvoiceManagement =
        openInvoiceManagement;

    window.ownerDashboardActions =
        ownerDashboardActions;


    console.log(
        "Synvora AI — Registered Owner Dashboard Actions:",
        Object.keys(ownerDashboardActions)
    );

})();