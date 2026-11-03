"use strict";

let expenses = [];
let editExpenseId = null;
let expenseChart = null;
let categoryChart = null;
let expenseInitialized = false;
let expenseStorageError = null;

function loadExpenseRecords() {
    expenseStorageError = null;
    try {
        const records = JSON.parse(localStorage.getItem("expenses") || "[]");
        if (!Array.isArray(records)) {
            throw new TypeError("Expected expense records to be a list.");
        }
        return records;
    } catch (error) {
        console.error("Unable to load expense records:", error);
        expenseStorageError = error;
        return [];
    }
}

function expenseCurrency(value) {
    const supported = ["USD", "PKR", "EUR", "GBP", "AED", "SAR"];
    return supported.includes(value) ? value : "USD";
}

function formatExpenseAmount(amount, currencyCode = "USD") {
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: expenseCurrency(currencyCode)
    }).format(Number(amount) || 0);
}

function formatExpenseTotals(records, predicate = () => true) {
    const totals = new Map();
    records.filter(predicate).forEach(record => {
        const code = expenseCurrency(record.currency);
        totals.set(code, (totals.get(code) || 0) + (Number(record.amount) || 0));
    });
    if (!totals.size) {
        return formatExpenseAmount(
            0,
            document.getElementById("financeOverviewCurrency")?.value || "USD"
        );
    }
    return [...totals.entries()]
        .map(([code, amount]) => formatExpenseAmount(amount, code))
        .join(" · ");
}

function expenseLocalDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function saveExpenseRecords() {
    if (expenseStorageError) {
        const message = document.getElementById("expenseFormMessage");
        if (message) message.textContent = "Saved expense data could not be read, so it was not overwritten. Check browser storage and reload.";
        return false;
    }
    try {
        localStorage.setItem("expenses", JSON.stringify(expenses));
        return true;
    } catch (error) {
        console.error("Unable to save expense records:", error);
        const message = document.getElementById("expenseFormMessage");
        if (message) message.textContent = "Could not save this expense in this browser. Check available storage and try again.";
        return false;
    }
}

function initExpense() {
    if (expenseInitialized) return;
    const modal = document.getElementById("expenseModal");
    const table = document.querySelector(".expense-table tbody");
    if (!modal || !table) return;
    expenseInitialized = true;
    expenses = loadExpenseRecords();

    document.querySelector(".add-expense-btn")?.addEventListener("click", openExpenseForm);
    document.getElementById("closeExpense")?.addEventListener("click", closeExpenseForm);
    document.getElementById("saveExpense")?.addEventListener("click", saveExpense);
    document.getElementById("exportExpense")?.addEventListener("click", exportExpensesCsv);
    document.getElementById("exportPdf")?.addEventListener("click", exportExpensesPdf);
    table.addEventListener("click", event => {
        const button = event.target.closest("[data-expense-action]");
        if (!button) return;
        if (button.dataset.expenseAction === "edit") editExpense(button.dataset.expenseId);
        if (button.dataset.expenseAction === "delete") deleteExpense(button.dataset.expenseId);
    });

    document.getElementById("searchExpense")?.addEventListener("input", () => displayExpenses(false));
    document.getElementById("categoryFilter")?.addEventListener("change", () => displayExpenses(false));
    document.getElementById("statusFilter")?.addEventListener("change", () => displayExpenses(false));
    displayExpenses();
}

function openExpenseForm() {
    const modal = document.getElementById("expenseModal");
    if (!modal) return;
    if (editExpenseId === null) {
        document.getElementById("expenseName").value = "";
        document.getElementById("expenseCategory").value = "";
        document.getElementById("expenseDate").value = expenseLocalDate();
        document.getElementById("expenseAmount").value = "";
        document.getElementById("expenseCurrency").value = "USD";
        document.getElementById("expenseStatus").value = "Paid";
        document.getElementById("expenseFormTitle").textContent = "Add expense";
        document.getElementById("saveExpense").textContent = "Save expense";
    }
    const message = document.getElementById("expenseFormMessage");
    if (message) message.textContent = "";
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
    document.getElementById("expenseName").focus();
}

function closeExpenseForm() {
    const modal = document.getElementById("expenseModal");
    if (modal) {
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
    }
    editExpenseId = null;
}

function saveExpense() {
    const name = document.getElementById("expenseName").value.trim();
    const category = document.getElementById("expenseCategory").value.trim();
    const date = document.getElementById("expenseDate").value;
    const amount = Number(document.getElementById("expenseAmount").value);
    const currency = expenseCurrency(document.getElementById("expenseCurrency").value);
    const status = document.getElementById("expenseStatus").value;
    const message = document.getElementById("expenseFormMessage");

    if (!name || !date || !Number.isFinite(amount) || amount <= 0) {
        if (message) message.textContent = "Enter an expense description, date and amount greater than zero.";
        return;
    }

    const previous = expenses.map(item => ({ ...item }));
    if (editExpenseId !== null) {
        const record = expenses.find(item => String(item.id) === String(editExpenseId));
        if (!record) {
            if (message) message.textContent = "This expense record could not be found. Close the form and try again.";
            return;
        }
        Object.assign(record, { name, category, date, amount, currency, status });
    } else {
        const id = expenses.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
        expenses.push({ id, name, category, date, amount, currency, status });
    }

    if (!saveExpenseRecords()) {
        expenses = previous;
        return;
    }
    closeExpenseForm();
    displayExpenses();
}

function displayExpenses(refresh = true) {
    const table = document.querySelector(".expense-table tbody");
    if (!table) return;
    syncExpenseCategoryFilter();
    const search = (document.getElementById("searchExpense")?.value || "").trim().toLowerCase();
    const category = document.getElementById("categoryFilter")?.value || "all";
    const statusFilter = document.getElementById("statusFilter")?.value || "all";
    const filtered = expenses.filter(expense =>
        String(expense.name || "").toLowerCase().includes(search) &&
        (category === "all" || expense.category === category) &&
        (statusFilter === "all" || expense.status === statusFilter)
    );
    table.replaceChildren();

    filtered.forEach(expense => {
        const row = document.createElement("tr");
        [
            `#${expense.id}`,
            expense.name || "—",
            expense.category || "Uncategorized",
            expense.date || "—",
            formatExpenseAmount(expense.amount, expense.currency)
        ].forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.append(cell);
        });

        const statusCell = document.createElement("td");
        const status = document.createElement("span");
        status.className = String(expense.status || "").toLowerCase();
        status.textContent = expense.status || "—";
        statusCell.append(status);
        row.append(statusCell);

        const actions = document.createElement("td");
        [["edit", "Edit"], ["delete", "Delete"]].forEach(([action, label]) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = `${action}-btn`;
            button.dataset.expenseAction = action;
            button.dataset.expenseId = String(expense.id);
            button.textContent = label;
            actions.append(button);
        });
        row.append(actions);
        table.append(row);
    });

    const emptyState = document.getElementById("expenseEmptyState");
    if (emptyState) {
        emptyState.hidden = filtered.length > 0;
        emptyState.textContent = expenses.length && !filtered.length
            ? "No expenses match these filters."
            : "No expense records yet. Add an expense to start tracking costs.";
    }
    updateSummary();
    if (refresh) {
        updateCharts();
        window.refreshFinanceOverview?.();
    }
}

function syncExpenseCategoryFilter() {
    const filter = document.getElementById("categoryFilter");
    if (!filter) return;
    const selected = filter.value;
    const values = [...new Set(expenses.map(item => item.category).filter(Boolean))]
        .sort((a, b) => String(a).localeCompare(String(b)));
    filter.replaceChildren(new Option("All Categories", "all"));
    values.forEach(value => filter.add(new Option(value, value)));
    filter.value = values.includes(selected) ? selected : "all";
}

function editExpense(id) {
    const record = expenses.find(item => String(item.id) === String(id));
    if (!record) return;
    editExpenseId = record.id;
    document.getElementById("expenseName").value = record.name || "";
    document.getElementById("expenseCategory").value = record.category || "";
    document.getElementById("expenseDate").value = record.date || "";
    document.getElementById("expenseAmount").value = record.amount || "";
    document.getElementById("expenseCurrency").value = expenseCurrency(record.currency);
    document.getElementById("expenseStatus").value = record.status || "Paid";
    document.getElementById("expenseFormTitle").textContent = "Edit expense";
    document.getElementById("saveExpense").textContent = "Save changes";
    openExpenseForm();
}

function deleteExpense(id) {
    const record = expenses.find(item => String(item.id) === String(id));
    if (!record || !window.confirm(`Delete expense "${record.name}"?`)) return;
    const previous = expenses;
    expenses = expenses.filter(item => String(item.id) !== String(id));
    if (!saveExpenseRecords()) {
        expenses = previous;
        return;
    }
    displayExpenses();
}

function updateSummary() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const isCurrentMonth = expense => {
        const date = new Date(`${expense.date || ""}T00:00:00`);
        return !Number.isNaN(date.getTime()) && date >= monthStart && date <= now;
    };
    [
        ["totalExpense", () => true],
        ["paidExpense", expense => expense.status === "Paid"],
        ["pendingExpense", expense => expense.status === "Pending"],
        ["monthlyExpense", isCurrentMonth]
    ].forEach(([id, predicate]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = formatExpenseTotals(expenses, predicate);
        });
}

function updateCharts() {
    if (typeof Chart === "undefined") return;
    const currencyCode = expenseCurrency(
        document.getElementById("financeOverviewCurrency")?.value || "USD"
    );
    const monthly = new Map();
    const categories = new Map();
    const chartExpenses = expenses.filter(expense => expenseCurrency(expense.currency) === currencyCode);
    chartExpenses.forEach(expense => {
        const amount = Number(expense.amount) || 0;
        const month = String(expense.date || "").slice(0, 7);
        const code = expenseCurrency(expense.currency);
        if (month) {
            if (!monthly.has(month)) monthly.set(month, {});
            monthly.get(month)[code] = (monthly.get(month)[code] || 0) + amount;
        }
        const category = expense.category || "Uncategorized";
        const categoryKey = `${code} · ${category}`;
        categories.set(categoryKey, (categories.get(categoryKey) || 0) + amount);
    });

    const monthLabels = [...monthly.keys()].sort();
    const monthCanvas = document.getElementById("expenseChart");
    if (monthCanvas) {
        const chartData = {
            labels: monthLabels,
            datasets: [{
                label: `Expenses · ${currencyCode}`,
                data: monthLabels.map(label => monthly.get(label)[currencyCode] || 0),
                borderColor: "#ffd700",
                backgroundColor: "rgba(255,215,0,.08)",
                fill: false,
                tension: .3
            }]
        };
        if (expenseChart) {
            expenseChart.data = chartData;
            expenseChart.update();
        } else {
            expenseChart = new Chart(monthCanvas, {
            type: "line",
            data: chartData,
            options: { responsive: true, maintainAspectRatio: false }
            });
        }
    }

    const categoryCanvas = document.getElementById("categoryChart");
    if (categoryCanvas) {
        const chartData = {
            labels: [...categories.keys()],
            datasets: [{
                label: `Expenses · ${currencyCode}`,
                data: [...categories.values()],
                backgroundColor: ["#00aeef", "#ffd700", "#42d392", "#9277e8", "#f47d8c"]
            }]
        };
        if (categoryChart) {
            categoryChart.data = chartData;
            categoryChart.update();
        } else {
            categoryChart = new Chart(categoryCanvas, {
            type: "doughnut",
            data: chartData,
            options: { responsive: true, maintainAspectRatio: false }
            });
        }
    }
}

function exportExpensesCsv() {
    if (!expenses.length) {
        window.alert("There are no saved expense records to export yet.");
        return;
    }
    const rows = [
        ["ID", "Name", "Category", "Date", "Amount", "Currency", "Status"],
        ...expenses.map(item => [item.id, item.name, item.category, item.date, item.amount, expenseCurrency(item.currency), item.status])
    ];
    const csv = rows.map(row => row.map(value =>
        csvSafeExpenseValue(value)
    ).join(",")).join("\r\n");
    const link = document.createElement("a");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.href = url;
    link.download = "synvora-expenses.csv";
    link.click();
    URL.revokeObjectURL(url);
}

function csvSafeExpenseValue(value) {
    let text = String(value ?? "");
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
}

function exportExpensesPdf() {
    if (!expenses.length) {
        window.alert("There are no saved expense records to export yet.");
        return;
    }
    if (!window.jspdf?.jsPDF) {
        window.alert("PDF export is unavailable. Check your connection and try again.");
        return;
    }
    const doc = new window.jspdf.jsPDF();
    if (typeof doc.autoTable !== "function") {
        window.alert("PDF table export is unavailable. Check your connection and try again.");
        return;
    }
    doc.text("Synvora AI Expense Report", 14, 20);
    doc.autoTable({
        head: [["ID", "Name", "Category", "Date", "Amount", "Currency", "Status"]],
        body: expenses.map(item => [item.id, item.name, item.category, item.date, item.amount, expenseCurrency(item.currency), item.status]),
        startY: 30
    });
    doc.save("synvora-expense-report.pdf");
}

function refreshExpenseRecords() {
    expenseStorageError = null;
    expenses = loadExpenseRecords();
    displayExpenses();
}

window.initExpense = initExpense;
window.displayExpenses = displayExpenses;
window.editExpense = editExpense;
window.deleteExpense = deleteExpense;
window.updateSummary = updateSummary;
window.updateCharts = updateCharts;
window.refreshExpenseRecords = refreshExpenseRecords;

document.addEventListener("change", event => {
    if (event.target.matches("#financeOverviewCurrency")) {
        updateSummary();
        updateCharts();
    }
});

window.addEventListener("storage", event => {
    if (event.key === "expenses") refreshExpenseRecords();
});
