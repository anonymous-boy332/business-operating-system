"use strict";

(function () {
    const customersKey = "customers";
    let initialized = false;
    let customersStorageError = null;

    function readCustomers() {
        customersStorageError = null;
        try {
            const stored = JSON.parse(localStorage.getItem(customersKey) || "[]");
            if (!Array.isArray(stored)) {
                throw new TypeError("Expected saved customers to be a list.");
            }
            return stored;
        } catch (error) {
            customersStorageError = error;
            console.error("Unable to read saved CRM customers:", error);
            return [];
        }
    }

    function readSalesOrders() {
        try {
            const stored = JSON.parse(localStorage.getItem("salesOrders") || "[]");
            if (!Array.isArray(stored)) throw new TypeError("Expected sales orders to be a list.");
            return stored;
        } catch (error) {
            console.error("Unable to read sales orders for CRM:", error);
            return [];
        }
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = String(value);
    }

    function migrateLegacyCustomers() {
        try {
            const currentValue = localStorage.getItem(customersKey);
            const legacyValue = localStorage.getItem("synvoraCRMCustomers");
            if (!legacyValue) return;
            const legacy = JSON.parse(legacyValue);
            if (!Array.isArray(legacy)) {
                throw new TypeError("Expected legacy CRM customers to be a list.");
            }
            if (!currentValue) {
                localStorage.setItem(customersKey, JSON.stringify(legacy));
                return;
            }
            const current = JSON.parse(currentValue);
            if (!Array.isArray(current)) {
                throw new TypeError("Expected saved CRM customers to be a list.");
            }
            const knownIds = new Set(current.map(customer => String(customer.id)));
            const knownEmails = new Set(current.map(customer =>
                String(customer.email || "").trim().toLowerCase()
            ).filter(Boolean));
            const missing = legacy.filter(customer =>
                !knownIds.has(String(customer.id)) &&
                (!customer.email || !knownEmails.has(String(customer.email).trim().toLowerCase()))
            );
            if (missing.length) {
                localStorage.setItem(customersKey, JSON.stringify([...current, ...missing]));
            }
        } catch (error) {
            console.error("Unable to migrate saved legacy CRM customers:", error);
            window.showCRMMessage?.("Older customer records could not be merged. Check browser storage before changing customer data.");
        }
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }

    function formatCurrencyTotals(customers) {
        const totals = new Map();
        const orders = readSalesOrders();
        const customerSpending = new Map();
        orders.filter(order => order.status === "Completed").forEach(order => {
            const id = String(order.customerId);
            const currency = String(order.currency || "USD").toUpperCase();
            if (!customerSpending.has(id)) customerSpending.set(id, new Map());
            const byCurrency = customerSpending.get(id);
            byCurrency.set(currency, (byCurrency.get(currency) || 0) + (Number(order.amount) || 0));
        });
        customers.forEach(customer => {
            const orderTotals = customerSpending.get(String(customer.id));
            if (orderTotals?.size) {
                orderTotals.forEach((value, code) => {
                    totals.set(code, (totals.get(code) || 0) + value);
                });
            } else {
                const code = String(customer.currency || "USD").toUpperCase();
                const value = Number(customer.totalSpending ?? customer.value) || 0;
                totals.set(code, (totals.get(code) || 0) + value);
            }
        });
        if (!totals.size) return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: "USD"
        }).format(0);
        return [...totals.entries()].map(([currency, value]) => {
            try {
                return new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency,
                    maximumFractionDigits: 2
                }).format(value);
            } catch (error) {
                console.error("Unable to format CRM customer value currency:", currency, error);
                return `${currency} ${value.toLocaleString()}`;
            }
        }).join(" · ");
    }

    function queryCustomers(customers) {
        const query = (document.getElementById("crmSearchInput")?.value || "")
            .trim()
            .toLowerCase();
        if (!query) return customers;
        return customers.filter(customer =>
            [customer.name, customer.company, customer.email, customer.phone, customer.status]
                .some(value => String(value || "").toLowerCase().includes(query))
        );
    }

    function displayCustomers(customerList) {
        const body = document.getElementById("customerTableBody");
        if (!body) return;
        const customers = customerList || queryCustomers(readCustomers());
        const orders = readSalesOrders();
        body.replaceChildren();

        if (!customers.length) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 8;
            cell.className = "crm-empty-state";
            cell.textContent = customersStorageError
                ? "Saved customer data could not be read. Check browser storage and reload."
                : "No customers found. Add a customer to start your directory.";
            row.append(cell);
            body.append(row);
            return;
        }

        customers.forEach(customer => {
            const row = document.createElement("tr");
            const values = [
                customer.name || "—",
                customer.company || "—",
                customer.email || "—",
                customer.phone || "—"
            ];
            values.forEach(value => {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.append(cell);
            });

            const statusCell = document.createElement("td");
            const status = document.createElement("span");
            status.className = `customer-status ${String(customer.status || "active").toLowerCase()}`;
            status.textContent = customer.status || "active";
            statusCell.append(status);
            row.append(statusCell);

            const orderCount = orders.length
                ? orders.filter(order =>
                    String(order.customerId) === String(customer.id) && order.status !== "Cancelled"
                ).length
                : Number(customer.orders) || 0;
            [orderCount, customer.date || "—"].forEach(value => {
                const cell = document.createElement("td");
                cell.textContent = String(value);
                row.append(cell);
            });

            const actions = document.createElement("td");
            actions.className = "crm-directory-actions";
            [["view", "View"], ["delete", "Delete"]].forEach(([action, label]) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = action === "view" ? "crm-action-btn" : "crm-action-btn crm-delete-btn";
                button.dataset.crmDirectoryAction = action;
                button.dataset.customerId = String(customer.id);
                button.textContent = label;
                actions.append(button);
            });
            row.append(actions);
            body.append(row);
        });
    }

    function updateCRMStats() {
        const customers = readCustomers();
        const now = new Date();
        const thisMonth = customers.filter(customer => {
            const date = new Date(`${customer.date || ""}T00:00:00`);
            return !Number.isNaN(date.getTime()) &&
                date.getMonth() === now.getMonth() &&
                date.getFullYear() === now.getFullYear();
        }).length;
        const active = customers.filter(customer =>
            String(customer.status || "active").toLowerCase() === "active"
        ).length;
        const rate = customers.length ? Math.round(active / customers.length * 100) : 0;

        setText("crmTotalCustomers", customers.length);
        setText("crmActiveCustomers", active);
        setText("crmNewCustomers", thisMonth);
        setText("crmCustomerGrowth", `${thisMonth} added this month`);
        setText("crmActiveRate", `${rate}% active`);
        setText("crmCustomerValue", formatCurrencyTotals(customers));
    }

    function refreshCRMDashboard() {
        const customers = readCustomers();
        const active = customers.filter(customer =>
            String(customer.status || "active").toLowerCase() === "active"
        ).length;
        const now = new Date();
        const newThisMonth = customers.filter(customer => {
            const date = new Date(`${customer.date || ""}T00:00:00`);
            return !Number.isNaN(date.getTime()) &&
                date.getMonth() === now.getMonth() &&
                date.getFullYear() === now.getFullYear();
        }).length;
        const activityCount = customers.reduce((count, customer) =>
            count + (Array.isArray(customer.activities) ? customer.activities.length : 0), 0
        );

        setText("crmDashboardCustomers", customers.length);
        setText("crmDashboardActive", active);
        setText("crmDashboardNew", newThisMonth);
        setText("crmDashboardActivities", activityCount);
        const notice = document.getElementById("crmDashboardDataNote");
        if (notice) {
            notice.textContent = customersStorageError
                ? "Saved customer data could not be read. Check browser storage before making changes."
                : "Live counts from your saved customer directory and activity history.";
        }
        window.refreshBusinessIntelligence?.();
    }

    function refreshCRM() {
        displayCustomers();
        updateCRMStats();
        refreshCRMDashboard();
    }

    function showCustomer(customerId) {
        const customers = readCustomers();
        const customer = customers.find(item => String(item.id) === String(customerId));
        if (!customer) return;
        try {
            localStorage.setItem("selectedCRMCustomer", String(customer.id));
        } catch (error) {
            console.error("Unable to save selected CRM customer:", error);
        }
        if (typeof window.selectCRMCustomer === "function") {
            window.selectCRMCustomer(String(customer.id));
        }
    }

    function deleteCustomer(customerId) {
        const customers = readCustomers();
        const customer = customers.find(item => String(item.id) === String(customerId));
        if (!customer || !window.confirm(`Delete customer "${customer.name}"?`)) return;
        if (customersStorageError) {
            window.showCRMMessage?.("Saved customer data could not be read; no changes were made.");
            return;
        }
        const nextCustomers = customers.filter(item => String(item.id) !== String(customerId));
        try {
            localStorage.setItem(customersKey, JSON.stringify(nextCustomers));
            if (String(localStorage.getItem("selectedCRMCustomer")) === String(customerId)) {
                localStorage.removeItem("selectedCRMCustomer");
                document.getElementById("customer-profile-container")?.replaceChildren();
                document.getElementById("customer-notes-container")?.replaceChildren();
                document.getElementById("customer-activity-container")?.replaceChildren();
            }
            refreshCRM();
            window.showCRMMessage?.("Customer deleted.");
        } catch (error) {
            console.error("Unable to delete CRM customer:", error);
            window.showCRMMessage?.("Customer could not be deleted. Check browser storage and try again.");
        }
    }

    async function loadCRMComponents() {
        const components = [
            ["crm-toolbar.html", "crm-toolbar-container"],
            ["crm-stats.html", "crm-stats-container"],
            ["customer-table.html", "customer-table-container"],
            ["customer-profile.html", "customer-profile-container"],
            ["customer-notes.html", "customer-notes-container"],
            ["customer-activity.html", "customer-activity-container"]
        ];
        for (const [file, containerId] of components) {
            const container = document.getElementById(containerId);
            if (!container) {
                console.error("CRM component container not found:", containerId);
                continue;
            }
            try {
                const response = await fetch(`components/${file}`);
                if (!response.ok) throw new Error(`Unable to load CRM component: ${file}`);
                container.innerHTML = await response.text();
            } catch (error) {
                console.error("CRM component loading failed:", file, error);
                container.textContent = `Unable to load ${file}. Check the file and reload.`;
            }
        }
    }

    async function initCRM() {
        if (initialized) {
            refreshCRM();
            return;
        }
        migrateLegacyCustomers();
        await loadCRMComponents();
        initialized = true;
        const search = document.getElementById("crmSearchInput");
        search?.addEventListener("input", () => displayCustomers());
        document.getElementById("crmSearchBtn")?.addEventListener("click", () => displayCustomers());
        document.getElementById("customerTableBody")?.addEventListener("click", event => {
            const button = event.target.closest("[data-crm-directory-action]");
            if (!button) return;
            if (button.dataset.crmDirectoryAction === "view") showCustomer(button.dataset.customerId);
            if (button.dataset.crmDirectoryAction === "delete") deleteCustomer(button.dataset.customerId);
        });
        document.addEventListener("click", event => {
            const button = event.target.closest("[data-crm-dashboard-action='directory']");
            if (!button) return;
            document.getElementById("customer-table-container")?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });
        refreshCRM();

        const selectedId = localStorage.getItem("selectedCRMCustomer");
        if (selectedId) showCustomer(selectedId);
    }

    window.initCRM = initCRM;
    window.displayCustomers = displayCustomers;
    window.updateCRMStats = updateCRMStats;
    window.refreshCRM = refreshCRM;
    window.refreshCRMDashboard = refreshCRMDashboard;

    window.addEventListener("storage", event => {
        if (event.key === customersKey || event.key === "salesOrders") refreshCRM();
    });
})();
