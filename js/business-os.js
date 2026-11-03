/* =========================================================
   SYNVORA AI — BUSINESS OS COMPONENT LOADER
   File: js/business-os.js
========================================================= */

"use strict";

/* ==========================================
   LOAD HTML COMPONENT
========================================== */

async function loadComponent(id, file) {

    const container = document.getElementById(id);

    if (!container) {
        console.error("Container not found:", id);
        return false;
    }

    try {
        const response = await fetch(file);

        if (!response.ok) {
            throw new Error("File Not Found: " + file);
        }

        const html = await response.text();

        container.innerHTML = html;

        console.log("Component Loaded:", file);

        return true;

    } catch (error) {

        console.error("Component Load Error:", error);

        container.innerHTML = `
            <div class="component-load-error">
                Unable to load component.
                <small>${file}</small>
            </div>
        `;

        return false;
    }
}

/* ==========================================
   MAIN BUSINESS OS COMPONENTS
========================================== */

loadComponent(
    "business-stats-container",
    "components/business-os/business-stats.html"
);

loadComponent(
    "business-actions-container",
    "components/business-os/quick-business-actions.html"
);

loadComponent(
    "business-overview-container",
    "components/business-os/business-overview.html"
).then((loaded) => {
    if (loaded) window.refreshInventoryManagement?.();
});

loadComponent(
    "business-activity-container",
    "components/business-os/recent-business-activity.html"
);

loadComponent(
    "revenue-analytics-container",
    "components/business-os/revenue-analytics.html"
).then((loaded) => {
    if (loaded) window.refreshFinanceOverview?.();
});

loadComponent(
    "crm-dashboard-container",
    "components/business-os/crm-dashboard.html"
).then((loaded) => {
    if (loaded) window.refreshCRMDashboard?.();
});

Promise.all([
    loadComponent(
        "inventory-dashboard-container",
        "components/business-os/inventory-dashboard.html"
    ),
    loadComponent(
        "inventory-table-container",
        "components/business-os/inventory-table.html"
    )
]).then(([dashboardLoaded, tableLoaded]) => {
    if (!dashboardLoaded || !tableLoaded) return;
    if (typeof window.initInventoryManagement === "function") {
        window.initInventoryManagement();
    } else {
        console.error("Inventory management could not be initialized.");
    }
});

loadComponent(
    "sales-dashboard-container",
    "components/business-os/sales-dashboard.html"
).then((loaded) => {
    if (!loaded) return;
    if (typeof window.startSalesSystem === "function") {
        window.startSalesSystem();
    } else {
        console.error("Sales dashboard could not be initialized.");
    }
});

loadComponent(
    "finance-dashboard-container",
    "components/business-os/finance-dashboard.html"
).then((loaded) => {
    if (loaded && typeof window.refreshFinanceOverview === "function") {
        window.refreshFinanceOverview();
    }
});

loadComponent(
    "employee-dashboard-container",
    "components/business-os/employee-dashboard.html"
);

loadComponent(
    "employee-tasks-container",
    "components/business-os/employee-tasks.html"
);

loadComponent(
    "ai-advisor-dashboard-container",
    "components/business-os/ai-business-advisor.html"
);

loadComponent(
    "automation-dashboard-container",
    "components/business-os/automation-dashboard.html"
);

loadComponent(
    "reports-dashboard-container",
    "components/business-os/reports-dashboard.html"
).then((loaded) => {
    if (loaded) window.refreshInventoryManagement?.();
});

loadComponent(
    "employee-table-container",
    "components/business-os/employee-table.html"
);

loadComponent(
    "notification-center-container",
    "components/business-os/notification-center.html"
).then((loaded) => {
    if (loaded) window.refreshInventoryManagement?.();
});

loadComponent(
    "calendar-dashboard-container",
    "components/business-os/calendar-dashboard.html"
);

loadComponent(
    "finance-toolbar-container",
    "components/finance-toolbar.html"
);

loadComponent(
    "income-management-container",
    "components/business-os/income.html"
).then((loaded) => {
    if (!loaded) return;
    if (typeof window.startIncomeSystem === "function") {
        window.startIncomeSystem();
    } else {
        console.error("Income management could not be initialized.");
    }
    window.refreshFinanceOverview?.();
});

/* ==========================================
   EXPENSE MANAGEMENT
========================================== */

loadComponent(
    "expense-management-container",
    "components/business-os/expenses.html"
).then((loaded) => {

    if (!loaded) return;

    console.log("Expense HTML Loaded");

    if (typeof window.initExpense === "function") {
        window.initExpense();
    }

    if (typeof window.displayExpenses === "function") {
        window.displayExpenses();
    }

});

/* ==========================================
   ADDITIONAL BUSINESS OS MODULES
========================================== */

loadComponent(
    "transactions-container",
    "components/transactions.html"
).then((loaded) => {
    if (!loaded) return;
    if (typeof window.initFinanceTransactions === "function") {
        window.initFinanceTransactions();
    } else {
        console.error("Finance transaction controls could not be initialized.");
    }
    window.refreshFinanceOverview?.();
});

loadComponent(
    "invoice-management-container",
    "components/business-os/invoice.html"
).then((loaded) => {
    if (!loaded) return;
    if (typeof window.initInvoice === "function") {
        window.initInvoice();
    } else {
        console.error("Invoice management could not be initialized.");
    }
    window.refreshFinanceOverview?.();
});

loadComponent(
    "finance-salaries-container",
    "components/business-os/finance-salaries.html"
).then((loaded) => {
    if (!loaded) return;
    if (typeof window.initFinanceSalaries === "function") {
        window.initFinanceSalaries();
    } else {
        console.error("Employee salary management could not be initialized.");
    }
});

loadComponent(
    "company-management-container",
    "components/business-os/company-management.html"
).then((loaded) => {

    if (!loaded) return;

    console.log("Company Management HTML Loaded");

    if (typeof window.initCompanyManagement === "function") {
        window.initCompanyManagement();
    }
});

/* ==========================================
   CRM MANAGEMENT
========================================== */

loadComponent(
    "crm-management-container",
    "components/business-os/crm.html"
).then((loaded) => {

    if (!loaded) return;

    console.log("CRM HTML Loaded");

    if (typeof window.initCRM === "function") {
        window.initCRM();
    } else {
        console.error("initCRM function not found.");
    }

});

/* ==========================================
   INVENTORY, EMPLOYEES AND OTHER COMPONENTS
========================================== */

loadComponent(
    "employee-management-container",
    "components/business-os/employees.html"
);

loadComponent(
    "owner-dashboard-container",
    "components/business-os/owner-dashboard.html"
);

loadComponent(
    "active-workspace-container",
    "components/business-os/active-workspace.html"
);

/* ==========================================
   COMPANY SETTINGS
========================================== */

loadComponent(
    "settings-container",
    "components/business-os/settings.html"
).then((loaded) => {

    if (!loaded) return;

    console.log("Company Settings HTML Loaded");

    if (typeof window.loadCompanySettings === "function") {
        window.loadCompanySettings();
    } else {
        console.warn(
            "loadCompanySettings() is not available yet."
        );
    }

});

/* ==========================================
   TEAM PERMISSIONS
========================================== */

loadComponent(
    "team-permissions-container",
    "components/business-os/team-permissions.html"
).then(function (loaded) {

    if (!loaded) return;

    if (typeof window.loadTeamPermissions === "function") {
        window.loadTeamPermissions();
    }

});

/* ==========================================
   OPEN ACCOUNT SECURITY
========================================== */

async function openAccountSecurity() {

    const target = document.getElementById(
        "account-security-container"
    );

    if (!target) {
        console.error("Account Security container not found.");
        return;
    }

    try {

        const response = await fetch(
            "components/business-os/account-security.html"
        );

        if (!response.ok) {
            throw new Error("Account Security file not found.");
        }

        const html = await response.text();

        target.innerHTML = html;

        target.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        console.log("Account Security Loaded Successfully");

    } catch (error) {

        console.error("Account Security Error:", error);

        target.innerHTML = `
            <div class="workspace-load-error">
                Unable to load Account Security.
                <small>${error.message}</small>
            </div>
        `;
    }
}

/* =========================================================
   COMPANY WORKSPACE — OPERATION BUTTONS
   Handles Finance, CRM, Inventory, Employees, Invoices,
   Transactions, Reports and Settings.
========================================================= */

(function () {

    if (window.companyWorkspaceButtonsInitialized) {
        return;
    }

    window.companyWorkspaceButtonsInitialized = true;

    const workspaceModuleTargets = {

        finance: "finance-dashboard-container",

        crm: "crm-management-container",

        inventory: "inventory-table-container",

        employees: "employee-management-container",

        invoices: "invoice-management-container",

        transactions: "transactions-container",

        reports: "reports-dashboard-container",

        settings: "settings-container"

    };

    document.addEventListener("click", async function (event) {

        if (!(event.target instanceof Element)) {
            return;
        }

        const button = event.target.closest(
            "[data-company-workspace-module]"
        );

        if (!button) {
            return;
        }

        event.preventDefault();

        if (button.disabled) {
            return;
        }

        const moduleName = button.dataset.companyWorkspaceModule;

        const targetId = workspaceModuleTargets[moduleName];

        if (!targetId) {
            console.error(
                "[Company Workspace] Unknown module:",
                moduleName
            );
            return;
        }

        const target = document.getElementById(targetId);

        if (!target) {
            console.error(
                "[Company Workspace] Target container not found:",
                targetId
            );
            return;
        }

        /*
         * SETTINGS:
         * Ensure the settings HTML exists before refreshing its data.
         */

        if (moduleName === "settings") {

            const settingsContent = target.querySelector(
                "#settingsCompanyName"
            );

            if (!settingsContent) {

                const loaded = await loadComponent(
                    "settings-container",
                    "components/business-os/settings.html"
                );

                if (!loaded) {
                    console.error(
                        "[Company Workspace] Settings HTML failed to load."
                    );
                    return;
                }

            }

            if (typeof window.loadCompanySettings === "function") {
                window.loadCompanySettings();
            } else {
                console.warn(
                    "[Company Workspace] loadCompanySettings() not found."
                );
            }
        }

        target.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        console.log(
            "[Company Workspace] Opened:",
            moduleName
        );

    });

    console.log(
        "Synvora AI — Company Workspace Buttons Registered"
    );

})();