"use strict";

(function () {
    const defaultCurrency = "USD";
    const supportedCurrencies = ["USD", "PKR", "EUR", "GBP", "AED", "SAR"];

    let financeChart = null;
    let revenueChart = null;
    let financeStorageErrors = [];
    let salaryManagementInitialized = false;

    function readRecords(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "[]");
            if (!Array.isArray(value)) {
                throw new TypeError("Expected a list of finance records.");
            }
            return value;
        } catch (error) {
            console.error("Unable to read finance records:", key, error);
            financeStorageErrors.push(key);
            return [];
        }
    }

    function amountOf(record) {
        const amount = Number(record.amount);
        return Number.isFinite(amount) && amount > 0 ? amount : 0;
    }

    function currencyOf(record) {
        return supportedCurrencies.includes(record.currency) ? record.currency : defaultCurrency;
    }

    function formatMoney(amount, currencyCode = defaultCurrency) {
        return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: supportedCurrencies.includes(currencyCode) ? currencyCode : defaultCurrency
        }).format(amount);
    }

    function formatCurrencyTotals(records, predicate = () => true) {
        const totals = new Map();
        records.filter(predicate).forEach(record => {
            const code = currencyOf(record);
            totals.set(code, (totals.get(code) || 0) + amountOf(record));
        });
        if (!totals.size) {
            return formatMoney(
                0,
                document.getElementById("financeOverviewCurrency")?.value || defaultCurrency
            );
        }
        return [...totals.entries()]
            .map(([code, amount]) => formatMoney(amount, code))
            .join(" · ");
    }

    function dateOf(record) {
        const date = new Date(`${record.date || ""}T00:00:00`);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function getFinanceData() {
        financeStorageErrors = [];
        return {
            incomes: readRecords("incomes"),
            expenses: readRecords("expenses"),
            invoices: readRecords("invoices")
        };
    }

    function periodStart(period, now) {
        if (period === "year") {
            return new Date(now.getFullYear(), 0, 1);
        }
        if (period === "quarter") {
            return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        }
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    function recordInPeriod(record, start, end) {
        const date = dateOf(record);
        return date && date >= start && date <= end;
    }

    function refreshFinanceOverview() {
        const dashboard = document.querySelector(".finance-dashboard");
        if (!dashboard) return;

        const { incomes: allIncomes, expenses: allExpenses, invoices: allInvoices } = getFinanceData();
        const now = new Date();
        const periodSelect = document.getElementById("financeOverviewPeriod");
        const currencySelect = document.getElementById("financeOverviewCurrency");
        const selectedPeriod = periodSelect ? periodSelect.value : "month";
        const selectedCurrency = currencySelect && supportedCurrencies.includes(currencySelect.value)
            ? currencySelect.value
            : defaultCurrency;
        const analyticsCurrency = document.getElementById("revenueAnalyticsCurrency");
        if (analyticsCurrency && analyticsCurrency.value !== selectedCurrency) {
            analyticsCurrency.value = selectedCurrency;
        }
        const incomes = allIncomes.filter(item => currencyOf(item) === selectedCurrency);
        const expenses = allExpenses.filter(item => currencyOf(item) === selectedCurrency);
        const invoices = allInvoices.filter(item => currencyOf(item) === selectedCurrency);
        const start = periodStart(selectedPeriod, now);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const periodIncomes = incomes.filter(item => recordInPeriod(item, start, end));
        const periodExpenses = expenses.filter(item => recordInPeriod(item, start, end));
        const received = periodIncomes
            .filter(item => item.status === "Received")
            .reduce((sum, item) => sum + amountOf(item), 0);
        const paid = periodExpenses
            .filter(item => item.status === "Paid")
            .reduce((sum, item) => sum + amountOf(item), 0);
        const receivables = incomes
            .filter(item => item.status === "Pending")
            .reduce((sum, item) => sum + amountOf(item), 0) +
            invoices
                .filter(item => item.status === "Pending")
                .reduce((sum, item) => sum + amountOf(item), 0);
        const totalIncome = periodIncomes.reduce((sum, item) => sum + amountOf(item), 0);
        const totalExpenses = periodExpenses.reduce((sum, item) => sum + amountOf(item), 0);
        const net = received - paid;
        const periodName = selectedPeriod === "year" ? "This year" :
            selectedPeriod === "quarter" ? "This quarter" : "This month";
        const periodLabel = selectedPeriod === "year" ? "Year to date" :
            selectedPeriod === "quarter" ? "Quarter to date" : "Current month";

        setText("financeDashboardIncome", formatMoney(received, selectedCurrency));
        setText("financeDashboardExpenses", formatMoney(paid, selectedCurrency));
        setText("financeDashboardNet", formatMoney(net, selectedCurrency));
        setText("financeDashboardReceivables", formatMoney(receivables, selectedCurrency));
        setText("financeDashboardIncomeNote", `${periodLabel} · ${selectedCurrency} · ${periodIncomes.length} income records`);
        setText("financeDashboardExpensesNote", `${periodLabel} · ${selectedCurrency} · ${periodExpenses.length} expense records`);
        setText("financeDashboardReceivablesNote", `${incomes.filter(item => item.status === "Pending").length} pending income · ${invoices.filter(item => item.status === "Pending").length} invoices`);
        setText(
            "financeDataNote",
            financeStorageErrors.length
                ? `Some saved data could not be read (${[...new Set(financeStorageErrors)].join(", ")}). Figures may be incomplete; check browser storage before saving new records.`
                : `Showing ${selectedCurrency} only; no exchange-rate conversion is applied.`
        );

        setText("financeTotalRevenue", formatMoney(totalIncome, selectedCurrency));
        setText("financeTotalExpenses", formatMoney(totalExpenses, selectedCurrency));
        setText("financeNetProfit", formatMoney(totalIncome - totalExpenses, selectedCurrency));
        setText(
            "financeProfitMargin",
            totalIncome > 0 ? `${(((totalIncome - totalExpenses) / totalIncome) * 100).toFixed(1)}%` : "—"
        );
        setText("financeSalesIncome", formatMoney(sumByCategory(periodIncomes, ["sales", "generator sale"]), selectedCurrency));
        setText("financeServicesIncome", formatMoney(sumByCategory(periodIncomes, ["service", "maintenance", "rental", "amc contract"]), selectedCurrency));
        setText("financeOtherIncome", formatMoney(sumOtherCategories(periodIncomes, [
            "sales", "generator sale", "service", "maintenance", "rental", "amc contract"
        ]), selectedCurrency));
        setText("financeOperationsExpense", formatMoney(sumByCategory(periodExpenses, ["business", "operations", "rent", "purchase", "marketing"]), selectedCurrency));
        setText("financeSalaryExpense", formatMoney(sumByCategory(periodExpenses, ["salary", "payroll"]), selectedCurrency));
        setText("financeOtherExpense", formatMoney(sumOtherCategories(periodExpenses, [
            "business", "operations", "rent", "purchase", "marketing", "salary", "payroll"
        ]), selectedCurrency));
        setText("transactionTotalIncome", formatMoney(incomes.reduce((sum, item) => sum + amountOf(item), 0), selectedCurrency));
        setText("transactionTotalExpense", formatMoney(expenses.reduce((sum, item) => sum + amountOf(item), 0), selectedCurrency));
        setText("transactionCurrentBalance", formatMoney(
            incomes.filter(item => item.status === "Received").reduce((sum, item) => sum + amountOf(item), 0) -
            expenses.filter(item => item.status === "Paid").reduce((sum, item) => sum + amountOf(item), 0),
            selectedCurrency
        ));
        setText("transactionMonthlyIncome", formatMoney(received, selectedCurrency));
        setText("transactionMonthlyExpense", formatMoney(paid, selectedCurrency));
        setText("financeRecordCount", String(incomes.length + expenses.length));
        setText("financeOverviewPeriodLabel", periodName);

        renderFinanceChart(incomes, expenses, start, end);
        renderRevenueAnalytics(allIncomes, allExpenses, now, selectedCurrency);
        renderFinanceLedger();
        window.refreshBusinessIntelligence?.();
    }

    function sumByCategory(records, categories) {
        return records.reduce((sum, record) => {
            const category = String(record.category || "").toLowerCase();
            const matches = categories.some(item => category.includes(item));
            return sum + (matches ? amountOf(record) : 0);
        }, 0);
    }

    function sumOtherCategories(records, excludedCategories) {
        return records.reduce((sum, record) => {
            const category = String(record.category || "").toLowerCase();
            const isExcluded = excludedCategories.some(item => category.includes(item));
            return sum + (isExcluded ? 0 : amountOf(record));
        }, 0);
    }

    function createTimeBuckets(start, end) {
        const buckets = [];
        if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
            for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
                const bucketStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
                const bucketEnd = new Date(bucketStart.getFullYear(), bucketStart.getMonth(), bucketStart.getDate() + 1);
                buckets.push({
                    label: bucketStart.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                    start: bucketStart,
                    end: bucketEnd
                });
            }
        } else {
            const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
            while (cursor <= end) {
                const bucketStart = new Date(cursor);
                const bucketEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
                buckets.push({
                    label: cursor.toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
                    start: bucketStart,
                    end: bucketEnd
                });
                cursor.setMonth(cursor.getMonth() + 1);
            }
        }
        return buckets;
    }

    function renderFinanceChart(incomes, expenses, start, end) {
        const canvas = document.getElementById("financeOverviewChart");
        const status = document.querySelector(".finance-chart-status");
        if (!canvas) return;
        if (typeof Chart === "undefined") {
            if (status) status.textContent = "Chart unavailable · saved totals remain available";
            return;
        }
        if (status) status.textContent = "Live saved records";

        const buckets = createTimeBuckets(start, end);

        const sumInBucket = (records, bucket, status) => records
            .filter(item => {
                const date = dateOf(item);
                return date && date >= start && date <= end &&
                    date >= bucket.start && date < bucket.end && item.status === status;
            })
            .reduce((sum, item) => sum + amountOf(item), 0);
        const labels = buckets.map(bucket => bucket.label);
        const incomeValues = buckets.map(bucket => sumInBucket(incomes, bucket, "Received"));
        const expenseValues = buckets.map(bucket => sumInBucket(expenses, bucket, "Paid"));

        const chartData = {
            labels,
            datasets: [
                { label: "Income received", data: incomeValues, backgroundColor: "rgba(0, 174, 239, .72)", borderRadius: 6 },
                { label: "Expenses paid", data: expenseValues, backgroundColor: "rgba(255, 215, 0, .68)", borderRadius: 6 }
            ]
        };
        if (financeChart) {
            financeChart.data = chartData;
            financeChart.update();
        } else {
            financeChart = new Chart(canvas, {
                type: "bar",
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: "#dbeafe" } } },
                    scales: {
                        x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255,255,255,.05)" } },
                        y: { beginAtZero: true, ticks: { color: "#94a3b8" }, grid: { color: "rgba(255,255,255,.07)" } }
                    }
                }
            });
        }
    }

    function renderRevenueAnalytics(incomes, expenses, now, currencyCode) {
        const section = document.querySelector(".revenue-analytics");
        if (!section) return;

        const periodSelect = document.getElementById("revenueAnalyticsPeriod");
        const selectedPeriod = periodSelect ? periodSelect.value : "month";
        const start = periodStart(selectedPeriod, now);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const periodIncomes = incomes.filter(item =>
            currencyOf(item) === currencyCode && recordInPeriod(item, start, end)
        );
        const periodExpenses = expenses.filter(item =>
            currencyOf(item) === currencyCode && recordInPeriod(item, start, end)
        );
        const received = periodIncomes.filter(item => item.status === "Received");
        const paid = periodExpenses.filter(item => item.status === "Paid");
        const totalIncome = received.reduce((sum, item) => sum + amountOf(item), 0);
        const totalExpenses = paid.reduce((sum, item) => sum + amountOf(item), 0);
        const net = totalIncome - totalExpenses;
        const periodName = selectedPeriod === "year" ? "This year" :
            selectedPeriod === "quarter" ? "This quarter" : "This month";
        const storageStatus = financeStorageErrors.length
            ? `Some saved data could not be read (${[...new Set(financeStorageErrors)].join(", ")}); figures may be incomplete.`
            : `Showing ${currencyCode} · ${periodName.toLowerCase()} · saved records only.`;

        setText("revenueAnalyticsIncome", formatMoney(totalIncome, currencyCode));
        setText("revenueAnalyticsExpenses", formatMoney(totalExpenses, currencyCode));
        setText("revenueAnalyticsNet", formatMoney(net, currencyCode));
        setText("revenueAnalyticsIncomeCount", `${received.length} received`);
        setText("revenueAnalyticsExpenseCount", `${paid.length} paid`);
        setText("revenueAnalyticsPeriodLabel", periodName);
        setText("revenueAnalyticsMargin", totalIncome > 0
            ? `${((net / totalIncome) * 100).toFixed(1)}%`
            : "—");
        setText("revenueAnalyticsIncomeCountDetail", String(received.length));
        setText("revenueAnalyticsExpenseCountDetail", String(paid.length));
        setText("revenueAnalyticsStatus", storageStatus);
        setText("revenueAnalyticsDescription", `Paid and received records · ${currencyCode} · ${periodName.toLowerCase()}.`);

        const canvas = document.getElementById("revenueChart");
        if (!canvas) return;
        if (typeof Chart === "undefined") {
            setText("revenueAnalyticsStatus", `${storageStatus} Chart unavailable.`);
            return;
        }

        const buckets = createTimeBuckets(start, end);
        const sumInBucket = (records, bucket) => records
            .filter(item => {
                const date = dateOf(item);
                return date && date >= bucket.start && date < bucket.end;
            })
            .reduce((sum, item) => sum + amountOf(item), 0);
        const incomeValues = buckets.map(bucket => sumInBucket(received, bucket));
        const expenseValues = buckets.map(bucket => sumInBucket(paid, bucket));
        const chartData = {
            labels: buckets.map(bucket => bucket.label),
            datasets: [
                {
                    label: "Income received",
                    data: incomeValues,
                    borderColor: "#00aeef",
                    backgroundColor: "rgba(0,174,239,.12)",
                    fill: true,
                    tension: 0.3
                },
                {
                    label: "Expenses paid",
                    data: expenseValues,
                    borderColor: "#ffd700",
                    backgroundColor: "rgba(255,215,0,.08)",
                    fill: false,
                    tension: 0.3
                },
                {
                    label: "Net cash flow",
                    data: incomeValues.map((value, index) => value - expenseValues[index]),
                    borderColor: "#42d392",
                    backgroundColor: "rgba(66,211,146,.08)",
                    fill: false,
                    tension: 0.3
                }
            ]
        };
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: "#dbeafe" } },
                tooltip: {
                    callbacks: {
                        label: context => `${context.dataset.label}: ${formatMoney(context.parsed.y, currencyCode)}`
                    }
                }
            },
            scales: {
                x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255,255,255,.05)" } },
                y: {
                    ticks: {
                        color: "#94a3b8",
                        callback: value => formatMoney(value, currencyCode)
                    },
                    grid: { color: "rgba(255,255,255,.07)" }
                }
            }
        };
        if (revenueChart) {
            revenueChart.data = chartData;
            revenueChart.options = options;
            revenueChart.update();
        } else {
            revenueChart = new Chart(canvas, { type: "line", data: chartData, options });
        }
    }

    function makeCell(text) {
        const cell = document.createElement("td");
        cell.textContent = text;
        return cell;
    }

    function renderFinanceLedger() {
        const table = document.getElementById("transactionList");
        if (!table) return;

        const { incomes, expenses } = getFinanceData();
        const search = (document.getElementById("searchTransaction")?.value || "").trim().toLowerCase();
        const typeFilter = document.getElementById("filterType")?.value || "all";
        const categoryFilter = document.getElementById("filterCategory")?.value || "all";
        const dateFilter = document.getElementById("filterDate")?.value || "";
        const entries = [
            ...incomes.map(item => ({ ...item, type: "income", label: item.name, id: String(item.id) })),
            ...expenses.map(item => ({ ...item, type: "expense", label: item.name, id: String(item.id) }))
        ].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
        const filtered = entries.filter(item =>
            (!search || `${item.label} ${item.category || ""}`.toLowerCase().includes(search)) &&
            (typeFilter === "all" || item.type === typeFilter) &&
            (categoryFilter === "all" || item.category === categoryFilter) &&
            (!dateFilter || item.date === dateFilter)
        );

        table.replaceChildren();
        filtered.forEach(item => {
            const row = document.createElement("tr");
            row.append(
                makeCell(item.label || "—"),
                makeCell(formatMoney(amountOf(item), currencyOf(item))),
                makeCell(item.type === "income" ? "Income" : "Expense"),
                makeCell(item.category || "Uncategorized"),
                makeCell(item.payment || "—")
            );
            const statusCell = document.createElement("td");
            const status = document.createElement("span");
            status.className = `status ${String(item.status || "").toLowerCase()}`;
            status.textContent = item.status || "—";
            statusCell.append(status);
            row.append(statusCell, makeCell(
                [item.date, item.time].filter(Boolean).join(" ") || "—"
            ));

            const actions = document.createElement("td");
            ["View", "Edit", "Delete"].forEach(action => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = `${action.toLowerCase()}-btn`;
                button.dataset.financeRecordAction = action.toLowerCase();
                button.dataset.financeRecordType = item.type;
                button.dataset.financeRecordId = item.id;
                button.textContent = action;
                actions.append(button);
            });
            row.append(actions);
            table.append(row);
        });

        const emptyState = document.getElementById("financeLedgerEmpty");
        if (emptyState) {
            emptyState.hidden = filtered.length > 0;
            if (!entries.length) {
                emptyState.textContent = "No saved income or expense records yet. Add your first transaction to see it here.";
            } else if (!filtered.length) {
                emptyState.textContent = "No finance records match these filters.";
            }
        }
    }

    function setFormMessage(message) {
        setText("transactionFormMessage", message);
    }

    function addTransaction() {
        const titleInput = document.getElementById("transactionTitle");
        const amountInput = document.getElementById("transactionAmount");
        const typeInput = document.getElementById("transactionType");
        const categoryInput = document.getElementById("transactionCategory");
        const statusInput = document.getElementById("transactionStatus");
        if (!titleInput || !amountInput || !typeInput || !categoryInput || !statusInput) return;

        const title = titleInput.value.trim();
        const amount = Number(amountInput.value);
        const currencyCode = document.getElementById("transactionCurrency")?.value || defaultCurrency;
        const dateTimeValue = document.getElementById("transactionDateTime")?.value || "";
        if (!title || !Number.isFinite(amount) || amount <= 0 ||
            !dateTimeValue || Number.isNaN(new Date(dateTimeValue).getTime())) {
            setFormMessage("Enter a description, valid date and time, and an amount greater than zero.");
            return;
        }

        const isIncome = typeInput.value === "income";
        const [date, time] = dateTimeValue.split("T");
        const reference = document.getElementById("transactionReference")?.value.trim() || "";
        const key = isIncome ? "incomes" : "expenses";
        financeStorageErrors = [];
        const records = readRecords(key);
        if (financeStorageErrors.length) {
            setFormMessage("Saved finance data could not be read, so this transaction was not saved.");
            return;
        }
        const nextId = records.reduce((max, record) => Math.max(max, Number(record.id) || 0), 0) + 1;
        records.push({
            id: nextId,
            name: title,
            category: categoryInput.value || "Other",
            date,
            time: time || "",
            amount,
            currency: supportedCurrencies.includes(currencyCode) ? currencyCode : defaultCurrency,
            status: isIncome ? (statusInput.value === "Pending" ? "Pending" : "Received") :
                (statusInput.value === "Pending" ? "Pending" : "Paid"),
            payment: document.getElementById("paymentMethod")?.value || "",
            reference,
            notes: document.getElementById("transactionNotes")?.value.trim() || ""
        });

        try {
            localStorage.setItem(key, JSON.stringify(records));
        } catch (error) {
            console.error("Unable to save finance record:", error);
            setFormMessage("Could not save this record in this browser. Check available storage and try again.");
            return;
        }

        titleInput.value = "";
        amountInput.value = "";
        document.getElementById("transactionDateTime").value = financeLocalDateTime();
        document.getElementById("transactionReference").value = "";
        document.getElementById("transactionCurrency").value = defaultCurrency;
        const notes = document.getElementById("transactionNotes");
        if (notes) notes.value = "";
        setFormMessage("Transaction saved.");
        window.refreshIncomeRecords?.();
        window.refreshExpenseRecords?.();
        refreshFinanceOverview();
        window.refreshBusinessIntelligence?.();
    }

    function openRecordDetails(type, id) {
        const key = type === "income" ? "incomes" : "expenses";
        const record = readRecords(key).find(item => String(item.id) === id);
        const modal = document.getElementById("viewTransactionModal");
        const details = document.getElementById("transactionDetails");
        if (!record || !modal || !details) return;

        details.replaceChildren();
        [
            ["Description", record.name],
            ["Type", type === "income" ? "Income" : "Expense"],
            ["Category", record.category || "Uncategorized"],
            ["Amount", formatMoney(amountOf(record), currencyOf(record))],
            ["Status", record.status || "—"],
            ["Date and time", [record.date, record.time].filter(Boolean).join(" ") || "—"],
            ["Payment method", record.payment || "—"],
            ["Reference", record.reference || "—"],
            ["Employee", record.employeeName || "—"],
            ["Salary period", record.salaryPeriod || "—"],
            ["Notes", record.notes || "—"]
        ].forEach(([label, value]) => {
            const line = document.createElement("p");
            const title = document.createElement("strong");
            title.textContent = `${label}: `;
            line.append(title, document.createTextNode(String(value)));
            details.append(line);
        });
        modal.style.display = "flex";
        modal.setAttribute("aria-hidden", "false");
    }

    function closeRecordDetails() {
        const modal = document.getElementById("viewTransactionModal");
        if (modal) {
            modal.style.display = "none";
            modal.setAttribute("aria-hidden", "true");
        }
    }

    function exportFinanceReport() {
        const { incomes, expenses, invoices } = getFinanceData();
        const rows = [
            ["Record type", "ID", "Description", "Category", "Date", "Time", "Amount", "Currency", "Status", "Payment method", "Reference", "Employee", "Salary period"],
            ...incomes.map(item => ["Income", item.id, item.name, item.category, item.date, item.time, item.amount, currencyOf(item), item.status, item.payment, item.reference, "", ""]),
            ...expenses.map(item => ["Expense", item.id, item.name, item.category, item.date, item.time, item.amount, currencyOf(item), item.status, item.payment, item.reference, item.employeeName, item.salaryPeriod]),
            ...invoices.map(item => ["Invoice", item.id, item.customer, "Invoice", item.date, "", item.amount, currencyOf(item), item.status, "", "", "", ""])
        ];
        if (rows.length === 1) {
            window.alert("There are no saved finance records to export yet.");
            return;
        }
        const csv = rows.map(row => row.map(csvSafeValue).join(",")).join("\r\n");
        const link = document.createElement("a");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        link.href = url;
        link.download = `synvora-finance-report-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }

    function csvSafeValue(value) {
        let text = String(value ?? "");
        if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
        return `"${text.replaceAll('"', '""')}"`;
    }

    function handleActionClick(event) {
        const actionButton = event.target.closest("[data-finance-action]");
        if (actionButton) {
            const action = actionButton.dataset.financeAction;
            if (action === "transaction") {
                const form = document.querySelector(".transaction-form");
                form?.scrollIntoView({ behavior: "smooth", block: "center" });
                document.getElementById("transactionTitle")?.focus({ preventScroll: true });
            } else if (action === "invoice") {
                if (typeof window.openInvoiceForm === "function") {
                    window.openInvoiceForm();
                } else {
                    window.alert("Invoice management is still loading. Please try again in a moment.");
                }
            } else if (action === "export") {
                exportFinanceReport();
            }
            return;
        }

        const recordButton = event.target.closest("[data-finance-record-action]");
        if (!recordButton) return;
        const { financeRecordAction: action, financeRecordType: type, financeRecordId: id } = recordButton.dataset;
        if (action === "view") {
            openRecordDetails(type, id);
        } else if (action === "edit") {
            (type === "income" ? window.editIncome : window.editExpense)?.(Number(id));
        } else if (action === "delete") {
            (type === "income" ? window.deleteIncome : window.deleteExpense)?.(Number(id));
        }
    }

    function initFinanceTransactions() {
        if (!document.getElementById("transactionList")) return;
        const dateTimeInput = document.getElementById("transactionDateTime");
        if (dateTimeInput && !dateTimeInput.value) dateTimeInput.value = financeLocalDateTime();
        renderFinanceLedger();
        updateTransactionStatusOptions();
    }

    function readEmployeesForPayroll() {
        try {
            const employees = JSON.parse(localStorage.getItem("employees") || "[]");
            if (!Array.isArray(employees)) {
                throw new TypeError("Expected saved employees to be a list.");
            }
            return employees;
        } catch (error) {
            console.error("Unable to read employees for payroll:", error);
            const message = document.getElementById("salaryFormMessage");
            if (message) message.textContent = "The saved employee list could not be read. Check browser storage before recording payroll.";
            return null;
        }
    }

    function refreshSalaryEmployees() {
        const select = document.getElementById("salaryEmployee");
        const employees = readEmployeesForPayroll();
        if (!select || !employees) return false;

        const selected = select.value;
        select.replaceChildren(new Option("Select an employee", ""));
        employees.forEach((employee, index) => {
            const id = String(employee.id || employee.email || employee.name || index);
            const option = new Option(
                `${employee.name || "Employee"}${employee.department ? ` · ${employee.department}` : ""}`,
                id
            );
            option.dataset.employeeName = employee.name || "Employee";
            select.add(option);
        });
        if (employees.some((employee, index) =>
            String(employee.id || employee.email || employee.name || index) === selected
        )) {
            select.value = selected;
        }
        setText("salaryEmployeeCount", String(employees.length));
        return true;
    }

    function renderSalaryHistory() {
        const table = document.getElementById("salaryHistoryList");
        if (!table) return;

        const expenses = readRecords("expenses");
        const records = expenses
            .filter(item => item.employeeId && String(item.category || "").toLowerCase() === "salary")
            .sort((a, b) => `${b.date || ""}T${b.time || ""}`.localeCompare(`${a.date || ""}T${a.time || ""}`));
        table.replaceChildren();
        records.slice(0, 12).forEach(record => {
            const row = document.createElement("tr");
            [
                record.employeeName || record.name || "—",
                record.salaryPeriod || "—",
                [record.date, record.time].filter(Boolean).join(" ") || "—",
                formatMoney(amountOf(record), currencyOf(record)),
                record.payment || "—",
                record.status || "—"
            ].forEach(value => row.append(makeCell(String(value))));
            table.append(row);
        });

        const emptyState = document.getElementById("salaryHistoryEmpty");
        if (emptyState) emptyState.hidden = records.length > 0;

        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const thisMonth = records.filter(record => record.salaryPeriod === monthKey);
        setText("salaryPaidThisMonth", formatCurrencyTotals(thisMonth, record => record.status === "Paid"));
        setText("salaryPendingThisMonth", formatCurrencyTotals(thisMonth, record => record.status === "Pending"));
    }

    function saveSalaryRecord() {
        const employeeSelect = document.getElementById("salaryEmployee");
        const employeeId = employeeSelect?.value || "";
        const employeeName = employeeSelect?.selectedOptions[0]?.dataset.employeeName || "";
        const period = document.getElementById("salaryPeriod")?.value || "";
        const dateTimeValue = document.getElementById("salaryDateTime")?.value || "";
        const amount = Number(document.getElementById("salaryAmount")?.value);
        const message = document.getElementById("salaryFormMessage");

        if (!employeeId || !employeeName || !/^\d{4}-\d{2}$/.test(period) ||
            !dateTimeValue || Number.isNaN(new Date(dateTimeValue).getTime()) ||
            !Number.isFinite(amount) || amount <= 0) {
            if (message) message.textContent = "Choose an employee, valid salary period and payment date, and enter an amount greater than zero.";
            return;
        }

        const employees = readEmployeesForPayroll();
        if (!employees || !employees.some((employee, index) =>
            String(employee.id || employee.email || employee.name || index) === employeeId
        )) {
            if (message) message.textContent = "This employee is no longer in the saved team list. Refresh the list and try again.";
            return;
        }

        financeStorageErrors = [];
        const expenses = readRecords("expenses");
        if (financeStorageErrors.length) {
            if (message) message.textContent = "Saved expenses could not be read, so this salary was not saved.";
            return;
        }
        const [date, time] = dateTimeValue.split("T");
        const id = expenses.reduce((max, record) => Math.max(max, Number(record.id) || 0), 0) + 1;
        expenses.push({
            id,
            name: `Salary · ${employeeName}`,
            category: "Salary",
            employeeId,
            employeeName,
            salaryPeriod: period,
            date,
            time: time || "",
            amount,
            currency: supportedCurrencies.includes(document.getElementById("salaryCurrency")?.value)
                ? document.getElementById("salaryCurrency").value
                : defaultCurrency,
            status: document.getElementById("salaryStatus")?.value === "Pending" ? "Pending" : "Paid",
            payment: document.getElementById("salaryPaymentMethod")?.value || "",
            reference: document.getElementById("salaryReference")?.value.trim() || "",
            notes: document.getElementById("salaryNotes")?.value.trim() || ""
        });

        try {
            localStorage.setItem("expenses", JSON.stringify(expenses));
        } catch (error) {
            console.error("Unable to save salary record:", error);
            if (message) message.textContent = "Could not save this salary in browser storage. Check available storage and try again.";
            return;
        }

        document.getElementById("salaryAmount").value = "";
        document.getElementById("salaryCurrency").value = defaultCurrency;
        document.getElementById("salaryReference").value = "";
        document.getElementById("salaryNotes").value = "";
        if (message) message.textContent = "Salary record saved and added to Finance expenses.";
        window.refreshExpenseRecords?.();
        refreshSalaryEmployees();
        renderSalaryHistory();
        refreshFinanceOverview();
        window.refreshBusinessIntelligence?.();
    }

    function initFinanceSalaries() {
        const section = document.querySelector(".finance-salaries");
        if (!section || salaryManagementInitialized) return;
        salaryManagementInitialized = true;
        const now = new Date();
        const period = document.getElementById("salaryPeriod");
        const dateTime = document.getElementById("salaryDateTime");
        if (period) period.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        if (dateTime) dateTime.value = financeLocalDateTime();
        refreshSalaryEmployees();
        renderSalaryHistory();
    }

    function filterTransactions() {
        renderFinanceLedger();
    }

    function updateTransactionStatusOptions() {
        const typeInput = document.getElementById("transactionType");
        const statusInput = document.getElementById("transactionStatus");
        if (!typeInput || !statusInput) return;
        const current = statusInput.value;
        const options = typeInput.value === "income"
            ? [["Received", "Received"], ["Pending", "Pending"]]
            : [["Paid", "Paid"], ["Pending", "Pending"]];
        statusInput.replaceChildren(...options.map(([value, label]) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = label;
            return option;
        }));
        statusInput.value = options.some(([value]) => value === current) ? current : options[0][0];
    }

    document.addEventListener("click", handleActionClick);
    document.addEventListener("input", event => {
        if (event.target.matches("#searchTransaction")) renderFinanceLedger();
    });
    document.addEventListener("change", event => {
        if (event.target.matches("#filterType, #filterCategory, #filterDate")) renderFinanceLedger();
        if (event.target.matches("#transactionType")) updateTransactionStatusOptions();
        if (event.target.matches("#financeOverviewPeriod, #financeOverviewCurrency, #revenueAnalyticsPeriod")) {
            refreshFinanceOverview();
        }
        if (event.target.matches("#revenueAnalyticsCurrency")) {
            const currencySelect = document.getElementById("financeOverviewCurrency");
            if (currencySelect) {
                currencySelect.value = event.target.value;
                currencySelect.dispatchEvent(new Event("change", { bubbles: true }));
            } else {
                refreshFinanceOverview();
            }
        }
    });
    document.addEventListener("click", event => {
        const moduleButton = event.target.closest(".business-os-nav-btn[data-business-module-target]");
        if (!moduleButton) return;
        requestAnimationFrame(() => {
            refreshFinanceOverview();
            if (moduleButton.dataset.businessModuleTarget === "finance") {
                window.refreshIncomeRecords?.();
                window.refreshExpenseRecords?.();
            }
        });
    });
    document.addEventListener("click", event => {
        const salaryAction = event.target.closest("[data-salary-action]");
        if (salaryAction) {
            if (salaryAction.dataset.salaryAction === "save") saveSalaryRecord();
            if (salaryAction.dataset.salaryAction === "refresh-employees") {
                if (refreshSalaryEmployees() && document.getElementById("salaryFormMessage")) {
                    document.getElementById("salaryFormMessage").textContent = "Employee list refreshed from saved team records.";
                }
            }
        }

        if (event.target.closest("[data-close-finance-record]")) closeRecordDetails();
    });

    window.addEventListener("storage", event => {
        if (["incomes", "expenses", "invoices"].includes(event.key)) refreshFinanceOverview();
        if (event.key === "expenses") renderSalaryHistory();
        if (event.key === "employees") refreshSalaryEmployees();
    });

    window.addTransaction = addTransaction;
    window.filterTransactions = filterTransactions;
    window.initFinanceTransactions = initFinanceTransactions;
    window.initFinanceSalaries = initFinanceSalaries;
    window.refreshFinanceOverview = refreshFinanceOverview;
    window.openFinanceRecordDetails = openRecordDetails;
    window.closeTransactionModal = closeRecordDetails;

    function financeLocalDate() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    }

    function financeLocalDateTime() {
        const now = new Date();
        const date = financeLocalDate();
        const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        return `${date}T${time}`;
    }

    document.addEventListener("DOMContentLoaded", () => {
        initFinanceTransactions();
        refreshFinanceOverview();
    });
})();
