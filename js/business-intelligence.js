"use strict";

(function () {
    const KEYS = {
        incomes: "incomes",
        expenses: "expenses",
        invoices: "invoices",
        orders: "salesOrders",
        customers: "customers",
        employees: "employees",
        tasks: "synvoraEmployeeTasks",
        products: "synvoraInventoryProducts",
        movements: "synvoraInventoryMovements",
        meetings: "synvoraBusinessMeetings",
        workflows: "synvoraBusinessWorkflows",
        runs: "synvoraBusinessWorkflowRuns",
        readNotifications: "synvoraBIReadNotifications"
    };
    const watchedContainers = [
        "business-stats-container", "business-actions-container", "business-overview-container",
        "automation-dashboard-container", "reports-dashboard-container", "notification-center-container",
        "calendar-dashboard-container", "business-activity-container", "ai-advisor-dashboard-container",
        "owner-dashboard-container"
    ];
    let editingMeetingId = null;

    const $ = id => document.getElementById(id);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[char]);
    const localDate = date => {
        const d = date || new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    const readList = key => {
        const raw = localStorage.getItem(key);
        if (raw === null) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error(`Saved data in "${key}" is not a list.`);
        return parsed;
    };
    const writeList = (key, value) => localStorage.setItem(key, JSON.stringify(value));
    const dateOf = item => {
        const raw = item?.date || item?.createdAt || item?.created || item?.updatedAt || item?.dueDate || "";
        const d = new Date(raw);
        return Number.isNaN(d.getTime()) ? null : d;
    };
    const dateKeyOf = item => {
        const raw = item?.date || item?.createdAt || item?.created || item?.updatedAt || item?.dueDate || "";
        return typeof raw === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : (dateOf(item) ? localDate(dateOf(item)) : "");
    };
    const amountOf = item => {
        const amount = Number(item?.amount);
        return Number.isFinite(amount) ? amount : 0;
    };
    const ownerCurrencyStorageKey = companyId => `synvoraOwnerDashboardCurrency:${companyId}`;
    const currencyOf = item => /^[A-Z]{3}$/.test(String(item?.currency || "").toUpperCase())
        ? String(item.currency).toUpperCase() : "";
    const totalsByCurrency = records => records.reduce((totals, item) => {
        const currency = currencyOf(item) || "UNSPECIFIED";
        totals[currency] = (totals[currency] || 0) + amountOf(item);
        return totals;
    }, {});
    const formatTotals = totals => {
        const entries = Object.entries(totals).sort(([a], [b]) => a.localeCompare(b));
        if (!entries.length) return "No recorded amounts";
        return entries.map(([currency, amount]) => {
            if (currency === "UNSPECIFIED") {
                return `Currency not set: ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
            }
            try {
                return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
            } catch (_) {
                return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
            }
        }).join(" · ");
    };
    const statusOf = item => String(item?.status || "").trim().toLowerCase();
    const isOpenTask = task => !["completed", "complete", "done", "cancelled", "canceled"].includes(statusOf(task));
    const dueDateOf = item => String(item?.dueDate || item?.deadline || item?.due || "").slice(0, 10);
    const isInRange = (value, start, end) => Boolean(value && value >= start && value <= end);

    function collectData() {
        const data = {};
        for (const [name, key] of Object.entries(KEYS)) {
            data[name] = readList(key);
        }
        const today = localDate();
        const weekEndDate = new Date();
        weekEndDate.setDate(weekEndDate.getDate() + 7);
        const weekEnd = localDate(weekEndDate);
        data.today = today;
        data.weekEnd = weekEnd;
        data.receivedIncome = data.incomes.filter(item => statusOf(item) === "received");
        data.paidExpenses = data.expenses.filter(item => statusOf(item) === "paid");
        data.completedOrders = data.orders.filter(item => statusOf(item) === "completed");
        data.openTasks = data.tasks.filter(isOpenTask);
        data.overdueTasks = data.openTasks.filter(task => dueDateOf(task) && dueDateOf(task) < today);
        data.tasksThisWeek = data.openTasks.filter(task => isInRange(dueDateOf(task), today, weekEnd));
        data.lowStock = data.products.filter(product => Number.isFinite(Number(product.stock)) &&
            Number.isFinite(Number(product.reorderLevel)) && Number(product.stock) <= Number(product.reorderLevel));
        data.overdueInvoices = data.invoices.filter(invoice =>
            !["paid", "received", "completed", "cancelled", "canceled"].includes(statusOf(invoice)) &&
            (dueDateOf(invoice) || String(invoice.date || "").slice(0, 10)) &&
            (dueDateOf(invoice) || String(invoice.date || "").slice(0, 10)) < today
        );
        data.attentionCount = data.overdueTasks.length + data.overdueInvoices.length + data.lowStock.length;
        data.reminderCount = data.tasksThisWeek.length + data.overdueInvoices.length + data.lowStock.length;
        data.activeEmployees = data.employees.filter(employee => statusOf(employee) !== "inactive").length;
        data.customersThisMonth = data.customers.filter(customer => dateKeyOf(customer).slice(0, 7) === today.slice(0, 7)).length;
        data.salesTotals = totalsByCurrency(data.completedOrders);
        data.incomeTotals = totalsByCurrency(data.receivedIncome);
        data.expenseTotals = totalsByCurrency(data.paidExpenses);
        data.netTotals = {};
        new Set([...Object.keys(data.incomeTotals), ...Object.keys(data.expenseTotals)]).forEach(currency => {
            data.netTotals[currency] = (data.incomeTotals[currency] || 0) - (data.expenseTotals[currency] || 0);
        });
        return data;
    }

    function setText(id, value) {
        const node = $(id);
        if (node) node.textContent = String(value);
    }

    function setFeedback(id, message, isError) {
        const node = $(id);
        if (!node) return;
        node.textContent = message || "";
        node.classList.toggle("is-error", Boolean(isError));
    }

    function selectedOwnerCurrency(data) {
        const select = $("ownerCurrencySelect");
        const company = window.SynvoraCompanyScope?.getActiveCompany();
        if (!select) return "all";

        const currencies = new Set();
        [data.incomes, data.expenses, data.orders].forEach(records => records.forEach(item => {
            const currency = currencyOf(item);
            if (currency) currencies.add(currency);
        }));
        const companyCurrency = String(company?.currency || "").toUpperCase();
        if (/^[A-Z]{3}$/.test(companyCurrency)) currencies.add(companyCurrency);

        const options = [["all", "All currencies"], ...Array.from(currencies).sort().map(currency => [currency, currency])];
        const signature = options.map(option => option.join(":")).join("|");
        if (select.dataset.options !== signature) {
            select.replaceChildren(...options.map(([value, label]) => {
                const option = document.createElement("option");
                option.value = value;
                option.textContent = label;
                return option;
            }));
            select.dataset.options = signature;
        }

        const storageKey = ownerCurrencyStorageKey(company?.id || "none");
        const savedCurrency = localStorage.getItem(storageKey);
        const preferredCurrency = currencies.has(companyCurrency) ? companyCurrency : "all";
        const previousSelection = select.value;
        const sameCompany = select.dataset.company === String(company?.id || "");
        const selected = options.some(([value]) => value === savedCurrency)
            ? savedCurrency
            : (sameCompany && options.some(([value]) => value === previousSelection)
                ? previousSelection
                : preferredCurrency);
        select.value = selected;
        select.dataset.company = String(company?.id || "");
        return selected;
    }

    function totalsForCurrency(totals, currency) {
        if (currency === "all") return formatTotals(totals);
        if (!Object.prototype.hasOwnProperty.call(totals, currency)) return "No amounts recorded";
        return formatTotals({ [currency]: totals[currency] });
    }

    function renderOwnerDashboard(data) {
        const status = $("ownerDashboardDataStatus");
        if (!status) return;
        const currency = selectedOwnerCurrency(data);
        const company = window.SynvoraCompanyScope?.getActiveCompany();
        const income = totalsForCurrency(data.incomeTotals, currency);
        const expenses = totalsForCurrency(data.expenseTotals, currency);
        const netCashflow = totalsForCurrency(data.netTotals, currency);
        status.closest(".owner-header-status")?.classList.remove("is-error");
        setText("ownerDashboardDataStatus", company
            ? `${company.name} · Live saved records · updated ${new Date().toLocaleTimeString()}`
            : "Select a company workspace to view its records");
        setText("ownerTotalRevenue", income);
        setText("ownerNetCashflow", netCashflow);
        setText("ownerTotalEmployees", data.employees.length);
        setText("ownerTotalOrders", data.orders.length);
        setText("ownerRevenuePerformance", income);
        setText("ownerRevenueDetail", `${data.receivedIncome.length} received record${data.receivedIncome.length === 1 ? "" : "s"} · ${currency === "all" ? "grouped by currency" : currency}`);
        setText("ownerSalesPerformance", data.completedOrders.length);
        setText("ownerSalesDetail", `${data.orders.length} orders total · ${totalsForCurrency(data.salesTotals, currency)}`);
        setText("ownerCustomerPerformance", data.customers.length);
        setText("ownerCustomerDetail", `${data.customersThisMonth} customer${data.customersThisMonth === 1 ? "" : "s"} added this month`);
        setText("ownerInventoryHealth", data.products.length);
        setText("ownerLowStockHealth", data.lowStock.length);
        setText("ownerWorkforceHealth", `${data.activeEmployees}/${data.employees.length} active · ${data.openTasks.length} open tasks`);

        setText("ownerModuleTeamCount", `${data.activeEmployees} active`);
        setText("ownerModuleTeamDetail", `${data.employees.length} saved team members · ${data.openTasks.length} open tasks (${data.overdueTasks.length} overdue)`);
        setText("ownerModuleFinanceCount", income);
        setText("ownerModuleFinanceDetail", `Paid expenses: ${expenses} · Net cash flow: ${netCashflow}`);
        setText("ownerModuleCRMCount", `${data.customers.length} customers`);
        setText("ownerModuleCRMDetail", `${data.orders.length} orders · ${data.completedOrders.length} completed · ${totalsForCurrency(data.salesTotals, currency)}`);
        setText("ownerModuleInventoryCount", `${data.products.length} product${data.products.length === 1 ? "" : "s"}`);
        setText("ownerModuleInventoryDetail", `${data.lowStock.length} at/below reorder level · ${data.movements.length} stock movements`);
        setText("ownerModuleBIAlerts", `${data.attentionCount} attention item${data.attentionCount === 1 ? "" : "s"}`);
        setText("ownerModuleBIDetail", `${data.overdueTasks.length} overdue tasks · ${data.overdueInvoices.length} overdue invoices · ${data.workflows.length} saved workflows`);
    }

    function renderMetrics(data) {
        const income = formatTotals(data.incomeTotals);
        setText("biIncomeTotal", income);
        setText("biIncomeNote", `${data.receivedIncome.length} received record${data.receivedIncome.length === 1 ? "" : "s"} · grouped by currency`);
        setText("biExpenseTotal", formatTotals(data.expenseTotals));
        setText("biExpenseNote", `${data.paidExpenses.length} paid record${data.paidExpenses.length === 1 ? "" : "s"} · grouped by currency`);
        setText("biNetCashflow", formatTotals(data.netTotals));
        setText("biNetNote", "Received income less paid expenses; currencies are not converted.");
        setText("biOrderCount", data.orders.length);
        setText("biOrderNote", `${data.completedOrders.length} completed · ${formatTotals(data.salesTotals)}`);
        setText("biCustomerCount", data.customers.length);
        setText("biCustomerNote", `${data.customersThisMonth} added this month · saved CRM records`);
        setText("biProductCount", data.products.length);
        setText("biProductNote", `${data.lowStock.length} at or below reorder level`);

        setText("biOverviewIncome", income);
        setText("biOverviewIncomeNote", `${data.receivedIncome.length} received finance records`);
        setText("inventoryOverviewProducts", data.products.length);
        setText("inventoryOverviewLowStock", data.products.length
            ? `${data.lowStock.length} product${data.lowStock.length === 1 ? "" : "s"} at or below reorder level`
            : "No saved products yet");
        setText("biOverviewCustomers", data.customers.length);
        setText("biOverviewNewCustomers", `${data.customersThisMonth} added this month`);
        setText("biOverviewOrders", data.orders.length);
        setText("biOverviewOrderSummary", `${data.completedOrders.length} completed · ${formatTotals(data.salesTotals)}`);
        setText("biOverviewAlerts", data.attentionCount);
        setText("biOverviewAlertSummary", `${data.overdueTasks.length} overdue tasks · ${data.overdueInvoices.length} overdue invoices · ${data.lowStock.length} low-stock products`);
        const advice = data.attentionCount
            ? `${data.attentionCount} saved-record item${data.attentionCount === 1 ? "" : "s"} need attention. Review the notification list for overdue tasks, invoices, and products at/below reorder level.`
            : "No overdue tasks, overdue invoices, or products at/below reorder level were found in the saved records.";
        setText("inventoryOverviewAdvisor", advice);

        setText("biReportOrders", data.orders.length);
        setText("biReportOrderDetails", `${data.completedOrders.length} completed · ${formatTotals(data.salesTotals)}`);
        setText("biReportIncome", income);
        setText("inventoryReportProducts", data.products.length);
        setText("inventoryReportLowStock", data.products.length
            ? `${data.lowStock.length} at/below reorder level`
            : "No saved inventory records");
        setText("biReportEmployees", data.employees.length);
        setText("biReportEmployeeDetails", `${data.activeEmployees} active employee${data.activeEmployees === 1 ? "" : "s"} on file`);

        setText("biAdvisorIncome", income);
        setText("biAdvisorIncomeNote", `${data.receivedIncome.length} received records; currencies are not converted.`);
        setText("biAdvisorCustomers", data.customers.length);
        setText("biAdvisorCustomerNote", `${data.customersThisMonth} added this month`);
        setText("biAdvisorAlerts", data.attentionCount);
        setText("biAdvisorLowStock", data.lowStock.length);
        setText("biMeetingsToday", data.meetings.filter(meeting =>
            meeting.date === data.today && statusOf(meeting) === "scheduled").length);
        setText("biMeetingsWeek", data.meetings.filter(meeting =>
            meeting.date >= data.today && meeting.date <= data.weekEnd && statusOf(meeting) === "scheduled").length);
        setText("biTasksWeek", data.tasksThisWeek.length);
        setText("biTasksOverdue", data.overdueTasks.length);
        setText("biOverdueTasksNote", `${data.reminderCount} open reminders across tasks, invoices, and inventory`);
        const todayMeetings = data.meetings.filter(meeting =>
            meeting.date === data.today && statusOf(meeting) === "scheduled").sort((a, b) => String(a.time).localeCompare(String(b.time)));
        setText("biMeetingsTodayNote", todayMeetings.length
            ? `Next: ${todayMeetings[0].time || "time not set"} · ${todayMeetings[0].title || "Meeting"}`
            : "No meetings scheduled for today");
    }

    function makeNotifications(data) {
        const notifications = [];
        data.lowStock.forEach(product => notifications.push({
            id: `stock:${product.id}`,
            kind: "warning",
            title: `Stock needs review: ${product.name || "Unnamed product"}`,
            detail: `Saved stock is ${product.stock}; reorder level is ${product.reorderLevel}.`,
            date: product.updatedAt || product.createdAt || ""
        }));
        data.overdueTasks.forEach(task => notifications.push({
            id: `task:${task.id}`,
            kind: "danger",
            title: `Overdue task: ${task.title || "Untitled task"}`,
            detail: `Due ${dueDateOf(task)}${task.assignedTo ? ` · assigned to ${task.assignedTo}` : ""}.`,
            date: dueDateOf(task)
        }));
        data.overdueInvoices.forEach(invoice => notifications.push({
            id: `invoice:${invoice.id}`,
            kind: "danger",
            title: `Overdue invoice: ${invoice.invoiceNumber || invoice.number || invoice.id || "Invoice"}`,
            detail: `Due ${dueDateOf(invoice) || String(invoice.date || "").slice(0, 10)}${amountOf(invoice) ? ` · ${currencyOf(invoice)} ${amountOf(invoice).toLocaleString()}` : ""}.`,
            date: dueDateOf(invoice) || String(invoice.date || "").slice(0, 10)
        }));
        data.meetings.filter(meeting => meeting.date === data.today && statusOf(meeting) === "scheduled")
            .forEach(meeting => notifications.push({
                id: `meeting:${meeting.id}`,
                kind: "info",
                title: `Meeting today: ${meeting.title || "Untitled meeting"}`,
                detail: `${meeting.time || "Time not set"}${meeting.location ? ` · ${meeting.location}` : ""}.`,
                date: meeting.date
            }));
        return notifications.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    }

    function renderNotifications(data) {
        const list = $("biNotificationList");
        if (!list) return;
        const notifications = makeNotifications(data);
        const read = new Set(data.readNotifications.map(String));
        if (!notifications.length) {
            list.innerHTML = `<article class="bi-record-card"><div class="bi-record-main"><h3>All clear</h3><p>No overdue tasks, invoices, low-stock products, or meetings today were found in saved records.</p></div></article>`;
            return;
        }
        list.innerHTML = notifications.map(item => {
            const isRead = read.has(item.id);
            return `<article class="notification-card bi-notification${isRead ? " is-read" : ""}">
                <div class="notification-icon ${esc(item.kind)}" aria-hidden="true">${item.kind === "danger" ? "!" : item.kind === "warning" ? "↻" : "i"}</div>
                <div class="notification-content"><h3>${esc(item.title)}${isRead ? "" : '<span class="bi-notification-badge">Unread</span>'}</h3>
                <p>${esc(item.detail)}</p><small>${esc(item.date || "Saved record")}</small></div>
            </article>`;
        }).join("");
    }

    function renderActivity(data) {
        const list = $("biActivityList");
        const ownerList = $("ownerActivityList");
        if (!list && !ownerList) return;
        const events = [];
        const add = (items, icon, title, description, idPrefix) => items.forEach(item => {
            const date = dateOf(item);
            events.push({
                id: `${idPrefix}:${item.id ?? item.invoiceNumber ?? item.date ?? events.length}`,
                icon, title, description: typeof description === "function" ? description(item) : description,
                time: date ? date.getTime() : 0,
                dateLabel: date ? date.toLocaleString() : "Date not recorded"
            });
        });
        add(data.incomes, "💰", "Income record", item => `${item.description || item.source || "Income"} · ${currencyOf(item) || "Currency not set"} ${amountOf(item).toLocaleString()}`, "income");
        add(data.expenses, "↗", "Expense record", item => `${item.description || item.category || "Expense"} · ${currencyOf(item) || "Currency not set"} ${amountOf(item).toLocaleString()}`, "expense");
        add(data.orders, "🛒", "Sales order", item => `${item.id || "Order"} · ${item.customerName || "Customer"} · ${item.status || "Status not set"}`, "order");
        add(data.customers, "👥", "Customer record", item => item.name || "Customer saved", "customer");
        add(data.employees, "👤", "Team member", item => `${item.name || "Employee saved"} · ${item.position || item.role || item.department || "Team record"}`, "employee");
        add(data.tasks, "✓", "Team task", item => `${item.title || "Task"} · ${item.status || "Status not set"}`, "task");
        add(data.invoices, "📄", "Invoice record", item => `${item.invoiceNumber || item.number || item.id || "Invoice"} · ${item.status || "Status not set"}`, "invoice");
        add(data.meetings, "📅", "Meeting scheduled", item => `${item.title || "Meeting"} · ${item.date || ""} ${item.time || ""}`.trim(), "meeting");
        add(data.movements, "📦", "Inventory movement", item => `${item.productName || "Product"} · ${item.type || "Stock update"} · ${item.previousStock ?? "—"} → ${item.newStock ?? "—"}`, "movement");
        events.sort((a, b) => b.time - a.time);
        if (!events.length) {
            const empty = `<div class="owner-empty-state"><span aria-hidden="true">📭</span><p>No activity recorded in your saved business modules yet.</p></div>`;
            if (list) list.innerHTML = `<article class="bi-activity-item"><div><h3>No activity recorded</h3><p>Saved finance, sales, customer, inventory, team, and meeting records will appear here.</p></div></article>`;
            if (ownerList) ownerList.innerHTML = empty;
            return;
        }
        const recent = events.slice(0, 8);
        if (list) {
            list.innerHTML = recent.map(item =>
                `<article class="bi-activity-item"><div><h3>${esc(item.icon)} ${esc(item.title)}</h3><p>${esc(item.description)}</p></div><span>${esc(item.dateLabel)}</span></article>`
            ).join("");
        }
        if (ownerList) {
            ownerList.innerHTML = recent.map(item =>
                `<article class="owner-activity-item"><span class="owner-activity-icon" aria-hidden="true">${esc(item.icon)}</span><div><h4>${esc(item.title)}</h4><p>${esc(item.description)}</p></div><time>${esc(item.dateLabel)}</time></article>`
            ).join("");
        }
    }

    function renderReports(data) {
        if ($("biReportStatus")) setFeedback("biReportStatus", "");
        setText("businessIntelligenceStatus", "");
    }

    function renderAll() {
        if (!watchedContainers.some(id => $(id)?.childElementCount)) return;
        try {
            const data = collectData();
            renderMetrics(data);
            renderOwnerDashboard(data);
            renderNotifications(data);
            renderActivity(data);
            renderAutomation(data);
            renderMeetings(data);
            renderReports(data);
            setText("businessIntelligenceStatus", "");
            window.businessIntelligenceSnapshot = data;
        } catch (error) {
            console.error("[Business Intelligence] Could not read saved records:", error);
            setText("businessIntelligenceStatus", `Business metrics could not be refreshed: ${error.message}`);
            if ($("ownerDashboardDataStatus")) {
                setText("ownerDashboardDataStatus", `Saved data could not be read: ${error.message}`);
                $("ownerDashboardDataStatus").closest(".owner-header-status")?.classList.add("is-error");
            }
            ["biNotificationList", "biActivityList", "biMeetingList", "biAutomationList"].forEach(id => {
                const list = $(id);
                if (list) list.innerHTML = `<p class="bi-feedback is-error">Saved records could not be loaded. No changes were made.</p>`;
            });
        }
    }

    function automationOutput(type, data) {
        if (type === "overdue-tasks") return `${data.overdueTasks.length} overdue task(s) found from saved team assignments.`;
        if (type === "low-stock") return `${data.lowStock.length} product(s) are at or below saved reorder levels.`;
        return `${data.orders.length} orders · ${data.customers.length} customers · ${formatTotals(data.incomeTotals)} received income · ${data.attentionCount} attention item(s).`;
    }

    function renderAutomation(data) {
        const list = $("biAutomationList");
        if (!list) return;
        const workflows = data.workflows;
        setText("biAutomationCount", workflows.length);
        setText("biAutomationEnabled", workflows.filter(item => item.enabled === true).length);
        setText("biAutomationRuns", data.runs.length);
        if (!workflows.length) {
            list.innerHTML = `<article class="bi-record-card"><div class="bi-record-main"><h3>No workflows configured</h3><p>Create a local check to generate an on-demand summary of saved records. Nothing runs in the background.</p></div></article>`;
        } else {
            list.innerHTML = workflows.map(workflow => `<article class="bi-record-card">
                <div class="bi-record-main"><h3>${esc(workflow.name || "Unnamed workflow")}</h3>
                <p>${esc(({ "business-summary": "Saved-record summary", "overdue-tasks": "Overdue task check", "low-stock": "Low-stock check" })[workflow.type] || "Local saved-record check")}</p>
                <span class="bi-status-pill${workflow.enabled ? "" : " is-muted"}">${workflow.enabled ? "Enabled · manual run" : "Disabled"}</span></div>
                <div class="bi-record-actions"><button type="button" class="secondary-btn" data-automation-action="toggle" data-workflow-id="${esc(workflow.id)}">${workflow.enabled ? "Disable" : "Enable"}</button><button type="button" class="primary-btn" data-automation-action="run" data-workflow-id="${esc(workflow.id)}"${workflow.enabled ? "" : " disabled"}>Run check</button><button type="button" class="secondary-btn" data-automation-action="delete" data-workflow-id="${esc(workflow.id)}">Delete</button></div>
            </article>`).join("");
        }
        const history = $("biAutomationHistory");
        if (history) history.innerHTML = data.runs.length
            ? data.runs.slice(0, 5).map(run => `<article class="bi-activity-item"><div><h3>${esc(run.name || "Local check")}</h3><p>${esc(run.result || "")}</p></div><span>${esc(run.ranAt ? new Date(run.ranAt).toLocaleString() : "Time not recorded")}</span></article>`).join("")
            : `<p class="bi-feedback">No local workflow runs have been saved.</p>`;
    }

    function renderMeetings(data) {
        const list = $("biMeetingList");
        if (!list) return;
        const meetings = data.meetings
            .filter(item => !["cancelled", "canceled"].includes(statusOf(item)))
            .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
        if (!meetings.length) {
            list.innerHTML = `<article class="bi-record-card"><div class="bi-record-main"><h3>No meetings scheduled</h3><p>Schedule a meeting to create your first saved calendar record.</p></div></article>`;
            return;
        }
        list.innerHTML = meetings.map(meeting => {
            const completed = statusOf(meeting) === "completed";
            return `<article class="bi-record-card"><div class="bi-record-main"><h3>${esc(meeting.title || "Untitled meeting")} <span class="bi-status-pill${completed ? " is-muted" : ""}">${completed ? "Completed" : "Scheduled"}</span></h3>
                <p>${esc(meeting.date || "Date not set")} · ${esc(meeting.time || "Time not set")}${meeting.location ? ` · ${esc(meeting.location)}` : ""}</p>
                ${meeting.attendees ? `<p>Attendees: ${esc(meeting.attendees)}</p>` : ""}
                ${meeting.notes ? `<p>${esc(meeting.notes)}</p>` : ""}</div>
                <div class="bi-record-actions">${completed ? "" : `<button type="button" class="secondary-btn" data-meeting-action="complete" data-meeting-id="${esc(meeting.id)}">Complete</button>`}<button type="button" class="secondary-btn" data-meeting-action="edit" data-meeting-id="${esc(meeting.id)}">Edit</button><button type="button" class="secondary-btn" data-meeting-action="delete" data-meeting-id="${esc(meeting.id)}">Delete</button></div>
            </article>`;
        }).join("");
    }

    function saveAutomation(name, type) {
        const workflows = readList(KEYS.workflows);
        workflows.unshift({
            id: `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name, type, enabled: true, createdAt: new Date().toISOString()
        });
        writeList(KEYS.workflows, workflows);
    }

    function runAutomation(id) {
        const workflows = readList(KEYS.workflows);
        const workflow = workflows.find(item => String(item.id) === String(id));
        if (!workflow) throw new Error("This workflow no longer exists.");
        if (!workflow.enabled) throw new Error("Enable this workflow before running it.");
        const data = collectData();
        const runs = readList(KEYS.runs);
        const run = {
            id: `run-${Date.now()}`,
            workflowId: workflow.id,
            name: workflow.name,
            type: workflow.type,
            ranAt: new Date().toISOString(),
            result: automationOutput(workflow.type, data)
        };
        runs.unshift(run);
        writeList(KEYS.runs, runs.slice(0, 30));
    }

    function handleAutomationAction(button) {
        const action = button.dataset.automationAction;
        const formWrap = $("biAutomationFormWrap");
        if (action === "create") {
            if (formWrap) formWrap.hidden = false;
            $("biAutomationName")?.focus();
            return;
        }
        if (action === "cancel-create") {
            $("biAutomationForm")?.reset();
            if (formWrap) formWrap.hidden = true;
            return;
        }
        try {
            const workflows = readList(KEYS.workflows);
            const workflow = workflows.find(item => String(item.id) === String(button.dataset.workflowId));
            if (!workflow) throw new Error("This workflow no longer exists.");
            if (action === "toggle") {
                workflow.enabled = !workflow.enabled;
                writeList(KEYS.workflows, workflows);
                setFeedback("biAutomationStatus", `Workflow ${workflow.enabled ? "enabled" : "disabled"}.`, false);
            } else if (action === "delete") {
                writeList(KEYS.workflows, workflows.filter(item => item !== workflow));
                setFeedback("biAutomationStatus", "Workflow deleted.", false);
            } else if (action === "run") {
                runAutomation(workflow.id);
                setFeedback("biAutomationStatus", "Local check completed and run history saved. No external actions were performed.", false);
            }
            renderAll();
        } catch (error) {
            console.error("[Business Intelligence] Workflow action failed:", error);
            setFeedback("biAutomationStatus", error.message, true);
        }
    }

    function saveMeeting(event) {
        event.preventDefault();
        const title = $("biMeetingTitle").value.trim();
        const date = $("biMeetingDate").value;
        const time = $("biMeetingTime").value;
        if (!title || !date || !time) {
            setFeedback("biMeetingFormStatus", "Enter a meeting title, date, and time.", true);
            return;
        }
        try {
            const meetings = readList(KEYS.meetings);
            const old = editingMeetingId === null ? null : meetings.find(item => String(item.id) === editingMeetingId);
            if (editingMeetingId !== null && !old) throw new Error("This meeting no longer exists.");
            const next = {
                ...(old || {}),
                id: old?.id || `meeting-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                title, date, time,
                attendees: $("biMeetingAttendees").value.trim(),
                location: $("biMeetingLocation").value.trim(),
                notes: $("biMeetingNotes").value.trim(),
                status: old?.status === "completed" ? "completed" : "scheduled",
                updatedAt: new Date().toISOString()
            };
            if (old) Object.assign(old, next);
            else meetings.unshift({ ...next, createdAt: next.updatedAt });
            writeList(KEYS.meetings, meetings);
            closeMeetingDialog();
            setFeedback("biMeetingStatus", old ? "Meeting updated." : "Meeting saved.", false);
            renderAll();
        } catch (error) {
            console.error("[Business Intelligence] Meeting save failed:", error);
            setFeedback("biMeetingFormStatus", `Meeting could not be saved: ${error.message}`, true);
        }
    }

    function openMeetingDialog(meeting) {
        const dialog = $("biMeetingDialog");
        if (!dialog) return;
        editingMeetingId = meeting ? String(meeting.id) : null;
        $("biMeetingDialogTitle").textContent = meeting ? "Edit meeting" : "Schedule a meeting";
        $("biMeetingTitle").value = meeting?.title || "";
        $("biMeetingDate").value = meeting?.date || localDate();
        $("biMeetingTime").value = meeting?.time || "";
        $("biMeetingAttendees").value = meeting?.attendees || "";
        $("biMeetingLocation").value = meeting?.location || "";
        $("biMeetingNotes").value = meeting?.notes || "";
        setFeedback("biMeetingFormStatus", "");
        const form = $("biMeetingForm");
        if (form) form.scrollTop = 0;
        if (typeof dialog.showModal === "function") dialog.showModal();
        else dialog.setAttribute("open", "");
        $("biMeetingTitle").focus();
    }

    function closeMeetingDialog() {
        const dialog = $("biMeetingDialog");
        if (dialog?.open && typeof dialog.close === "function") dialog.close();
        else dialog?.removeAttribute("open");
        $("biMeetingForm")?.reset();
        editingMeetingId = null;
    }

    function handleMeetingAction(button) {
        const action = button.dataset.meetingAction;
        if (action === "new") return openMeetingDialog();
        if (action === "close") return closeMeetingDialog();
        try {
            const meetings = readList(KEYS.meetings);
            const meeting = meetings.find(item => String(item.id) === String(button.dataset.meetingId));
            if (!meeting) throw new Error("This meeting no longer exists.");
            if (action === "edit") return openMeetingDialog(meeting);
            if (action === "complete") {
                meeting.status = "completed";
                meeting.updatedAt = new Date().toISOString();
                writeList(KEYS.meetings, meetings);
                setFeedback("biMeetingStatus", "Meeting marked complete.", false);
            } else if (action === "delete") {
                writeList(KEYS.meetings, meetings.filter(item => item !== meeting));
                setFeedback("biMeetingStatus", "Meeting deleted.", false);
            }
            renderAll();
        } catch (error) {
            console.error("[Business Intelligence] Meeting action failed:", error);
            setFeedback("biMeetingStatus", error.message, true);
        }
    }

    function exportReport() {
        try {
            const data = collectData();
            const rows = [
                ["Section", "Record", "Status", "Date", "Currency", "Amount", "Details"],
                ...data.incomes.map(item => ["Income", item.id || "", item.status || "", dateKeyOf(item), currencyOf(item), amountOf(item), item.description || item.source || ""]),
                ...data.expenses.map(item => ["Expense", item.id || "", item.status || "", dateKeyOf(item), currencyOf(item), amountOf(item), item.description || item.category || ""]),
                ...data.orders.map(item => ["Sales order", item.id || "", item.status || "", dateKeyOf(item), currencyOf(item), amountOf(item), `${item.customerName || ""} ${item.details || ""}`.trim()]),
                ...data.invoices.map(item => ["Invoice", item.invoiceNumber || item.number || item.id || "", item.status || "", dateKeyOf(item), currencyOf(item), amountOf(item), item.customerName || ""]),
                ...data.customers.map(item => ["Customer", item.id || "", item.status || "", dateKeyOf(item), "", "", item.name || ""]),
                ...data.employees.map(item => ["Employee", item.id || "", item.status || "", dateKeyOf(item), "", "", item.name || ""]),
                ...data.products.map(item => ["Inventory", item.sku || item.id || "", `${item.stock ?? ""} in stock`, dateKeyOf(item), currencyOf(item), item.unitCost ?? "", item.name || ""])
            ];
            const csv = rows.map(row => row.map(value => {
                let text = String(value ?? "");
                if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
                return `"${text.replace(/"/g, '""')}"`;
            }).join(",")).join("\r\n");
            const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = `business-report-${localDate()}.csv`;
            document.body.append(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
            setFeedback("biReportStatus", "Business report exported from saved records.", false);
        } catch (error) {
            console.error("[Business Intelligence] Report export failed:", error);
            setFeedback("biReportStatus", `Report could not be exported: ${error.message}`, true);
        }
    }

    function markNotificationsRead() {
        try {
            const data = collectData();
            const current = new Set(data.readNotifications.map(String));
            makeNotifications(data).forEach(item => current.add(item.id));
            writeList(KEYS.readNotifications, [...current]);
            setFeedback("biNotificationStatus", "Current notifications marked as read.", false);
            renderAll();
        } catch (error) {
            console.error("[Business Intelligence] Notifications could not be marked read:", error);
            setFeedback("biNotificationStatus", error.message, true);
        }
    }

    function getBusinessContext() {
        const data = collectData();
        return [
            "Current saved business data (local browser records; amounts grouped by currency, no conversion):",
            `Received income: ${formatTotals(data.incomeTotals)} from ${data.receivedIncome.length} record(s).`,
            `Paid expenses: ${formatTotals(data.expenseTotals)} from ${data.paidExpenses.length} record(s).`,
            `Net cash flow: ${formatTotals(data.netTotals)}; currencies are not converted.`,
            `Sales orders: ${data.orders.length} total; ${data.completedOrders.length} completed (${formatTotals(data.salesTotals)}).`,
            `Customers: ${data.customers.length}; employees: ${data.employees.length} (${data.activeEmployees} active).`,
            `Inventory: ${data.products.length} products; ${data.lowStock.length} at/below reorder level.`,
            `Open tasks: ${data.openTasks.length}; overdue tasks: ${data.overdueTasks.length}; overdue invoices: ${data.overdueInvoices.length}.`,
            "Treat missing data as unknown, not as zero business activity. Do not invent historical trends or exchange rates."
        ].join("\n");
    }

    document.addEventListener("click", event => {
        if (!(event.target instanceof Element)) return;
        const automation = event.target.closest("[data-automation-action]");
        if (automation) return handleAutomationAction(automation);
        const meeting = event.target.closest("[data-meeting-action]");
        if (meeting) return handleMeetingAction(meeting);
        if (event.target.closest("[data-report-action='export']")) return exportReport();
        if (event.target.closest("[data-notification-action='read-all']")) return markNotificationsRead();
        if (event.target.closest("[data-business-action='refresh']")) return renderAll();
    });

    document.addEventListener("submit", event => {
        if (event.target.id === "biAutomationForm") {
            event.preventDefault();
            const name = $("biAutomationName").value.trim();
            if (!name) return setFeedback("biAutomationStatus", "Enter a workflow name.", true);
            try {
                saveAutomation(name, $("biAutomationType").value);
                $("biAutomationForm").reset();
                $("biAutomationFormWrap").hidden = true;
                setFeedback("biAutomationStatus", "Local workflow saved. It will only run when you select Run check.", false);
                renderAll();
            } catch (error) {
                console.error("[Business Intelligence] Workflow could not be saved:", error);
                setFeedback("biAutomationStatus", `Workflow could not be saved: ${error.message}`, true);
            }
        }
        if (event.target.id === "biMeetingForm") saveMeeting(event);
    });

    document.addEventListener("cancel", event => {
        if (event.target.id === "biMeetingDialog") {
            event.preventDefault();
            closeMeetingDialog();
        }
    }, true);
    document.addEventListener("click", event => {
        if (event.target.id === "biMeetingDialog") closeMeetingDialog();
    });

    window.refreshBusinessIntelligence = renderAll;
    window.getBusinessIntelligenceContext = getBusinessContext;
    window.addEventListener("storage", event => {
        if (!event.key || Object.values(KEYS).includes(event.key)) renderAll();
    });
    document.addEventListener("business:records-changed", renderAll);
    document.addEventListener("change", event => {
        if (event.target?.id !== "ownerCurrencySelect") return;
        const company = window.SynvoraCompanyScope?.getActiveCompany();
        if (company) localStorage.setItem(ownerCurrencyStorageKey(company.id), event.target.value);
        renderAll();
    });
    window.addEventListener("synvora:company-changed", () => {
        [
            "refreshIncomeRecords",
            "refreshExpenseRecords",
            "refreshFinanceOverview",
            "refreshCRM",
            "refreshCRMDashboard",
            "refreshSalesDashboard",
            "refreshInventoryManagement",
            "loadEmployees",
            "updateEmployeeSummary",
            "loadAttendanceRecords",
            "loadAttendanceEmployees",
            "loadAttendanceHistory",
            "loadEmployeeTasks",
            "updateEmployeeDashboard",
            "updateEmployeeAttendanceDashboard",
            "refreshInvoices"
        ].forEach(name => {
            if (typeof window[name] !== "function") return;
            try {
                window[name]();
            } catch (error) {
                console.error(`[Company workspace] Could not refresh ${name}:`, error);
            }
        });
        renderAll();
    });
    const observer = new MutationObserver(() => requestAnimationFrame(renderAll));
    watchedContainers.forEach(id => {
        const container = $(id);
        if (container) observer.observe(container, { childList: true, subtree: id === "owner-dashboard-container" });
    });
    document.addEventListener("DOMContentLoaded", renderAll);
    renderAll();
})();
