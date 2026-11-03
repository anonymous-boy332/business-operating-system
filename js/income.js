"use strict";

let incomes = [];
let editIncomeId = null;
let incomeChart = null;
let incomeCategoryChart = null;
let incomeInitialized = false;
let incomeStorageError = null;

function loadIncomeRecords() {
    incomeStorageError = null;
    try {
        const records = JSON.parse(localStorage.getItem("incomes") || "[]");
        if (!Array.isArray(records)) {
            throw new TypeError("Expected income records to be a list.");
        }
        return records;
    } catch (error) {
        console.error("Unable to load income records:", error);
        incomeStorageError = error;
        return [];
    }
}

function incomeCurrency(value) {
    const supported = ["USD", "PKR", "EUR", "GBP", "AED", "SAR"];
    return supported.includes(value) ? value : "USD";
}

function formatIncomeAmount(amount, currencyCode = "USD") {
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: incomeCurrency(currencyCode)
    }).format(Number(amount) || 0);
}

function formatIncomeTotals(records, predicate = () => true) {
    const totals = new Map();
    records.filter(predicate).forEach(record => {
        const code = incomeCurrency(record.currency);
        totals.set(code, (totals.get(code) || 0) + (Number(record.amount) || 0));
    });
    if (!totals.size) {
        return formatIncomeAmount(
            0,
            document.getElementById("financeOverviewCurrency")?.value || "USD"
        );
    }
    return [...totals.entries()]
        .map(([code, amount]) => formatIncomeAmount(amount, code))
        .join(" · ");
}

function incomeLocalDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function saveIncomeRecords() {
    if (incomeStorageError) {
        const message = document.getElementById("incomeFormMessage");
        if (message) message.textContent = "Saved income data could not be read, so it was not overwritten. Check browser storage and reload.";
        return false;
    }
    try {
        localStorage.setItem("incomes", JSON.stringify(incomes));
        return true;
    } catch (error) {
        console.error("Unable to save income records:", error);
        const message = document.getElementById("incomeFormMessage");
        if (message) message.textContent = "Could not save this income in this browser. Check available storage and try again.";
        return false;
    }
}

function startIncomeSystem() {
    if (!document.querySelector(".income-section")) return;
    if (incomeInitialized) {
        displayIncome();
        return;
    }
    initIncome();
    initIncomeExport();
    initIncomeFilters();
    displayIncome();
}

function initIncome() {
    if (incomeInitialized) return;
    const modal = document.getElementById("incomeModal");
    const table = document.querySelector(".income-table tbody");
    if (!modal || !table) return;
    incomeInitialized = true;
    incomes = loadIncomeRecords();

    document.querySelector(".add-income-btn")?.addEventListener("click", openIncomeForm);
    document.getElementById("closeIncome")?.addEventListener("click", closeIncomeForm);
    document.getElementById("saveIncome")?.addEventListener("click", saveIncome);
    table.addEventListener("click", event => {
        const button = event.target.closest("[data-income-action]");
        if (!button) return;
        if (button.dataset.incomeAction === "edit") editIncome(button.dataset.incomeId);
        if (button.dataset.incomeAction === "delete") deleteIncome(button.dataset.incomeId);
    });
}

function openIncomeForm() {
    const modal = document.getElementById("incomeModal");
    if (!modal) return;
    if (editIncomeId === null) {
        document.getElementById("incomeName").value = "";
        document.getElementById("incomeSource").value = "";
        document.getElementById("incomeDate").value = incomeLocalDate();
        document.getElementById("incomeAmount").value = "";
        document.getElementById("incomeCurrency").value = "USD";
        document.getElementById("incomeStatus").value = "Received";
        document.getElementById("incomeFormTitle").textContent = "Add income";
        document.getElementById("saveIncome").textContent = "Save income";
    }
    const message = document.getElementById("incomeFormMessage");
    if (message) message.textContent = "";
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
    document.getElementById("incomeName").focus();
}

function closeIncomeForm() {
    const modal = document.getElementById("incomeModal");
    if (modal) {
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
    }
    editIncomeId = null;
}

function saveIncome() {
    const name = document.getElementById("incomeName").value.trim();
    const category = document.getElementById("incomeSource").value.trim();
    const date = document.getElementById("incomeDate").value;
    const amount = Number(document.getElementById("incomeAmount").value);
    const currency = incomeCurrency(document.getElementById("incomeCurrency").value);
    const status = document.getElementById("incomeStatus").value;
    const message = document.getElementById("incomeFormMessage");
    if (!name || !date || !Number.isFinite(amount) || amount <= 0) {
        if (message) message.textContent = "Enter an income description, date and amount greater than zero.";
        return;
    }

    const previous = incomes.map(item => ({ ...item }));
    if (editIncomeId !== null) {
        const record = incomes.find(item => String(item.id) === String(editIncomeId));
        if (!record) {
            if (message) message.textContent = "This income record could not be found. Close the form and try again.";
            return;
        }
        Object.assign(record, { name, category, date, amount, currency, status });
    } else {
        const id = incomes.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
        incomes.push({ id, name, category, date, amount, currency, status });
    }

    if (!saveIncomeRecords()) {
        incomes = previous;
        return;
    }
    closeIncomeForm();
    displayIncome();
}

function displayIncome(records = incomes, refresh = true) {
    const table = document.querySelector(".income-table tbody");
    if (!table) return;
    syncIncomeCategoryFilter();
    table.replaceChildren();

    records.forEach(income => {
        const row = document.createElement("tr");
        [
            `#${income.id}`,
            income.name || "—",
            income.category || "Uncategorized",
            income.date || "—",
            formatIncomeAmount(income.amount, income.currency)
        ].forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.append(cell);
        });

        const statusCell = document.createElement("td");
        const status = document.createElement("span");
        status.className = String(income.status || "").toLowerCase();
        status.textContent = income.status || "—";
        statusCell.append(status);
        row.append(statusCell);

        const actions = document.createElement("td");
        [["edit", "Edit"], ["delete", "Delete"]].forEach(([action, label]) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = `${action}-btn`;
            button.dataset.incomeAction = action;
            button.dataset.incomeId = String(income.id);
            button.textContent = label;
            actions.append(button);
        });
        row.append(actions);
        table.append(row);
    });

    const emptyState = document.getElementById("incomeEmptyState");
    if (emptyState) {
        emptyState.hidden = records.length > 0;
        emptyState.textContent = incomes.length && !records.length
            ? "No income records match these filters."
            : "No income records yet. Add income to start tracking revenue.";
    }

    function syncIncomeCategoryFilter() {
        const filter = document.getElementById("incomeSourceFilter");
        if (!filter) return;
        const selected = filter.value;
        const values = [...new Set(incomes.map(item => item.category).filter(Boolean))]
            .sort((a, b) => String(a).localeCompare(String(b)));
        filter.replaceChildren(new Option("All Sources", "all"));
        values.forEach(value => filter.add(new Option(value, value)));
        filter.value = values.includes(selected) ? selected : "all";
    }

    updateIncomeSummary();
    if (refresh) {
        updateIncomeCharts();
        window.refreshFinanceOverview?.();
    }
}

function editIncome(id) {
    const record = incomes.find(item => String(item.id) === String(id));
    if (!record) return;
    editIncomeId = record.id;
    document.getElementById("incomeName").value = record.name || "";
    document.getElementById("incomeSource").value = record.category || "";
    document.getElementById("incomeDate").value = record.date || "";
    document.getElementById("incomeAmount").value = record.amount || "";
    document.getElementById("incomeCurrency").value = incomeCurrency(record.currency);
    document.getElementById("incomeStatus").value = record.status || "Received";
    document.getElementById("incomeFormTitle").textContent = "Edit income";
    document.getElementById("saveIncome").textContent = "Save changes";
    openIncomeForm();
}

function deleteIncome(id) {
    const record = incomes.find(item => String(item.id) === String(id));
    if (!record || !window.confirm(`Delete income "${record.name}"?`)) return;
    const previous = incomes;
    incomes = incomes.filter(item => String(item.id) !== String(id));
    if (!saveIncomeRecords()) {
        incomes = previous;
        return;
    }
    displayIncome();
}

function updateIncomeSummary() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const isCurrentMonth = income => {
        const date = new Date(`${income.date || ""}T00:00:00`);
        return !Number.isNaN(date.getTime()) && date >= monthStart && date <= now;
    };
    [
        ["totalIncome", () => true],
        ["receivedIncome", income => income.status === "Received"],
        ["pendingIncome", income => income.status === "Pending"],
        ["monthlyIncome", isCurrentMonth]
    ].forEach(([id, predicate]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = formatIncomeTotals(incomes, predicate);
        });
}

function updateIncomeCharts() {
    if (typeof Chart === "undefined") return;
    const currencyCode = incomeCurrency(
        document.getElementById("financeOverviewCurrency")?.value || "USD"
    );
    const monthly = new Map();
    const categories = new Map();
    const chartIncomes = incomes.filter(income => incomeCurrency(income.currency) === currencyCode);
    chartIncomes.forEach(income => {
        const amount = Number(income.amount) || 0;
        const month = String(income.date || "").slice(0, 7);
        const code = incomeCurrency(income.currency);
        if (month) {
            if (!monthly.has(month)) monthly.set(month, {});
            monthly.get(month)[code] = (monthly.get(month)[code] || 0) + amount;
        }
        const category = income.category || "Uncategorized";
        const categoryKey = `${code} · ${category}`;
        categories.set(categoryKey, (categories.get(categoryKey) || 0) + amount);
    });

    const monthLabels = [...monthly.keys()].sort();
    const monthCanvas = document.getElementById("incomeChart");
    if (monthCanvas) {
        const chartData = {
            labels: monthLabels,
            datasets: [{
                label: `Income · ${currencyCode}`,
                data: monthLabels.map(label => monthly.get(label)[currencyCode] || 0),
                borderColor: "#00aeef",
                backgroundColor: "rgba(0,174,239,.08)",
                fill: false,
                tension: .3
            }]
        };
        if (incomeChart) {
            incomeChart.data = chartData;
            incomeChart.update();
        } else {
            incomeChart = new Chart(monthCanvas, {
            type: "line",
            data: chartData,
            options: { responsive: true, maintainAspectRatio: false }
            });
        }
    }

    const categoryCanvas = document.getElementById("incomeSourceChart");
    if (categoryCanvas) {
        const chartData = {
            labels: [...categories.keys()],
            datasets: [{
                label: `Income · ${currencyCode}`,
                data: [...categories.values()],
                backgroundColor: ["#00aeef", "#ffd700", "#42d392", "#9277e8", "#f47d8c"]
            }]
        };
        if (incomeCategoryChart) {
            incomeCategoryChart.data = chartData;
            incomeCategoryChart.update();
        } else {
            incomeCategoryChart = new Chart(categoryCanvas, {
            type: "doughnut",
            data: chartData,
            options: { responsive: true, maintainAspectRatio: false }
            });
        }
    }
}

function initIncomeExport() {
    document.getElementById("exportIncome")?.addEventListener("click", () => {
        if (!incomes.length) {
            window.alert("There are no saved income records to export yet.");
            return;
        }
        const rows = [
            ["ID", "Name", "Category", "Date", "Amount", "Currency", "Status"],
            ...incomes.map(item => [item.id, item.name, item.category, item.date, item.amount, incomeCurrency(item.currency), item.status])
        ];
        downloadIncomeCsv(rows);
    });

    document.getElementById("exportIncomePdf")?.addEventListener("click", () => {
        if (!incomes.length) {
            window.alert("There are no saved income records to export yet.");
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
        doc.text("Synvora AI Income Report", 14, 20);
        doc.autoTable({
            head: [["ID", "Name", "Category", "Date", "Amount", "Currency", "Status"]],
            body: incomes.map(item => [item.id, item.name, item.category, item.date, item.amount, incomeCurrency(item.currency), item.status]),
            startY: 30
        });
        doc.save("synvora-income-report.pdf");
    });
}

function downloadIncomeCsv(rows) {
    const csv = rows.map(row => row.map(value =>
        csvSafeValue(value)
    ).join(",")).join("\r\n");
    const link = document.createElement("a");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.href = url;
    link.download = "synvora-income.csv";
    link.click();
    URL.revokeObjectURL(url);
}

function csvSafeValue(value) {
    let text = String(value ?? "");
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
}

function initIncomeFilters() {
    document.getElementById("searchIncome")?.addEventListener("input", filterIncome);
    document.getElementById("incomeSourceFilter")?.addEventListener("change", filterIncome);
    document.getElementById("incomeStatusFilter")?.addEventListener("change", filterIncome);
}

function filterIncome() {
    const search = (document.getElementById("searchIncome")?.value || "").trim().toLowerCase();
    const category = document.getElementById("incomeSourceFilter")?.value || "all";
    const status = document.getElementById("incomeStatusFilter")?.value || "all";
    displayIncome(incomes.filter(item =>
        String(item.name || "").toLowerCase().includes(search) &&
        (category === "all" || item.category === category) &&
        (status === "all" || item.status === status)
    ), false);
}

function refreshIncomeRecords() {
    incomeStorageError = null;
    incomes = loadIncomeRecords();
    displayIncome();
}

window.startIncomeSystem = startIncomeSystem;
window.initIncome = initIncome;
window.displayIncome = displayIncome;
window.editIncome = editIncome;
window.deleteIncome = deleteIncome;
window.refreshIncomeRecords = refreshIncomeRecords;

document.addEventListener("change", event => {
    if (event.target.matches("#financeOverviewCurrency")) {
        updateIncomeSummary();
        updateIncomeCharts();
    }
});

window.addEventListener("storage", event => {
    if (event.key === "incomes") refreshIncomeRecords();
});

window.addEventListener("DOMContentLoaded", startIncomeSystem);
