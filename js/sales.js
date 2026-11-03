"use strict";

(function () {
    const ordersKey = "salesOrders";
    const customerKey = "customers";
    const currencies = ["USD", "PKR", "EUR", "GBP", "AED", "SAR"];
    let initialized = false;
    let editingOrderId = null;
    let revenueChart = null;
    let statusChart = null;

    function readList(key, label) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "[]");
            if (!Array.isArray(value)) throw new TypeError(`Expected ${label} to be a list.`);
            return { value, error: null };
        } catch (error) {
            console.error(`Unable to read ${label}:`, error);
            return { value: [], error };
        }
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = String(value);
    }

    function formatMoney(amount, currency) {
        const code = currencies.includes(currency) ? currency : "USD";
        return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: code,
            maximumFractionDigits: 2
        }).format(Number(amount) || 0);
    }

    function localDate() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    }

    function selectedPeriodRange(now, period) {
        if (period === "year") return new Date(now.getFullYear(), 0, 1);
        if (period === "quarter") return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }

    function getFilters() {
        return {
            period: document.getElementById("salesPeriodFilter")?.value || "month",
            currency: currencies.includes(document.getElementById("salesCurrencyFilter")?.value)
                ? document.getElementById("salesCurrencyFilter").value
                : "USD",
            status: document.getElementById("salesStatusFilter")?.value || "all"
        };
    }

    function orderMatchesPeriod(order, period, now) {
        if (period === "all") return true;
        const date = new Date(`${order.date || ""}T00:00:00`);
        return !Number.isNaN(date.getTime()) &&
            date >= selectedPeriodRange(now, period) &&
            date <= new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    }

    function filteredOrders(orders, ignoreStatus) {
        const filters = getFilters();
        const now = new Date();
        return orders.filter(order =>
            currencies.includes(order.currency || "USD") &&
            (order.currency || "USD") === filters.currency &&
            orderMatchesPeriod(order, filters.period, now) &&
            (ignoreStatus || filters.status === "all" || order.status === filters.status)
        );
    }

    function renderSummary(orders) {
        const filters = getFilters();
        const matchingOrders = filteredOrders(orders);
        const revenue = matchingOrders
            .filter(order => order.status === "Completed")
            .reduce((sum, order) => sum + (Number(order.amount) || 0), 0);
        const openOrders = matchingOrders.filter(order =>
            order.status === "Pending" || order.status === "Processing"
        ).length;
        const servedCustomers = new Set(matchingOrders.map(order => String(order.customerId))).size;

        setText("salesTotalRevenue", formatMoney(revenue, filters.currency));
        setText("salesRevenueCaption", `Completed sales · ${filters.currency} · ${filters.period === "all" ? "all time" : `this ${filters.period}`}`);
        setText("salesOrderCount", matchingOrders.length);
        setText("salesOpenOrderCount", openOrders);
        setText("salesCustomerCount", servedCustomers);
        setText("salesDashboardDataNote", `Showing saved orders only · ${filters.currency} · ${filters.period === "all" ? "all time" : `this ${filters.period}`}.`);
    }

    function renderOrders(orders) {
        const body = document.getElementById("salesOrdersTableBody");
        const empty = document.getElementById("salesOrdersEmptyState");
        if (!body) return;
        const matchingOrders = filteredOrders(orders).sort((a, b) =>
            String(b.date || "").localeCompare(String(a.date || ""))
        );
        body.replaceChildren();

        matchingOrders.forEach(order => {
            const row = document.createElement("tr");
            const orderId = document.createElement("td");
            orderId.textContent = String(order.id || "—");
            row.append(orderId);
            const customer = document.createElement("td");
            customer.textContent = String(order.customerName || "—");
            row.append(customer);
            const details = document.createElement("td");
            details.textContent = String(order.details || "—");
            row.append(details);
            const date = document.createElement("td");
            date.textContent = String(order.date || "—");
            row.append(date);
            const amount = document.createElement("td");
            amount.textContent = formatMoney(order.amount, order.currency);
            row.append(amount);
            const statusCell = document.createElement("td");
            const status = document.createElement("span");
            status.className = `sales-order-status ${String(order.status || "").toLowerCase()}`;
            status.textContent = String(order.status || "—");
            statusCell.append(status);
            row.append(statusCell);

            const actions = document.createElement("td");
            actions.className = "sales-order-actions-cell";
            [["edit", "Edit"], ["delete", "Delete"]].forEach(([action, label]) => {
                const button = document.createElement("button");
                button.type = "button";
                button.dataset.salesOrderAction = action;
                button.dataset.salesOrderId = String(order.id);
                button.textContent = label;
                actions.append(button);
            });
            row.append(actions);
            body.append(row);
        });

        if (empty) {
            empty.hidden = matchingOrders.length > 0;
            empty.textContent = orders.length
                ? "No saved orders match these filters."
                : "No saved orders yet. Create an order to start tracking sales.";
        }
    }

    function renderCharts(orders) {
        const revenueCanvas = document.getElementById("salesPerformanceChart");
        const statusCanvas = document.getElementById("salesStatusChart");
        if (typeof Chart === "undefined") {
            setText("salesDashboardDataNote", "Saved sales totals are available, but charts could not load.");
            return;
        }
        const filters = getFilters();
        const matching = filteredOrders(orders, true);
        const now = new Date();
        const start = filters.period === "all"
            ? new Date(now.getFullYear(), now.getMonth() - 11, 1)
            : selectedPeriodRange(now, filters.period);
        const bucketEnd = filters.period === "month"
            ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
            : new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const buckets = [];
        if (filters.period === "month") {
            for (let day = new Date(start); day < bucketEnd; day.setDate(day.getDate() + 1)) {
                const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
                buckets.push({
                    label: dayStart.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                    start: dayStart,
                    end: new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() + 1)
                });
            }
        } else {
            const end = filters.period === "all" ? new Date(now.getFullYear(), now.getMonth() + 1, 1) : bucketEnd;
            for (let month = new Date(start); month < end; month.setMonth(month.getMonth() + 1)) {
                const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
                buckets.push({
                    label: monthStart.toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
                    start: monthStart,
                    end: new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)
                });
            }
        }
        const sumBucket = (bucket, predicate) => matching
            .filter(order => {
                const date = new Date(`${order.date || ""}T00:00:00`);
                return predicate(order) && !Number.isNaN(date.getTime()) &&
                    date >= bucket.start && date < bucket.end;
            })
            .reduce((sum, order) => sum + (Number(order.amount) || 0), 0);

        if (revenueCanvas) {
            const data = {
                labels: buckets.map(bucket => bucket.label),
                datasets: [
                    {
                        label: `Completed sales · ${filters.currency}`,
                        data: buckets.map(bucket => sumBucket(bucket, order => order.status === "Completed")),
                        borderColor: "#00aeef",
                        backgroundColor: "rgba(0,174,239,.12)",
                        fill: true,
                        tension: 0.3,
                        yAxisID: "amount"
                    },
                    {
                        label: "Orders",
                        data: buckets.map(bucket => matching.filter(order => {
                            const date = new Date(`${order.date || ""}T00:00:00`);
                            return !Number.isNaN(date.getTime()) &&
                                date >= bucket.start && date < bucket.end;
                        }).length),
                        borderColor: "#42d392",
                        backgroundColor: "rgba(66,211,146,.1)",
                        fill: false,
                        tension: 0.3,
                        yAxisID: "orders"
                    }
                ]
            };
            const options = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: "#dbeafe" } } },
                scales: {
                    x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255,255,255,.05)" } },
                    amount: {
                        type: "linear",
                        position: "left",
                        beginAtZero: true,
                        ticks: { color: "#94a3b8", callback: value => formatMoney(value, filters.currency) },
                        grid: { color: "rgba(255,255,255,.07)" }
                    },
                    orders: {
                        type: "linear",
                        position: "right",
                        beginAtZero: true,
                        ticks: { color: "#94a3b8", precision: 0 },
                        grid: { drawOnChartArea: false }
                    }
                }
            };
            if (revenueChart) {
                revenueChart.data = data;
                revenueChart.options = options;
                revenueChart.update();
            } else {
                revenueChart = Chart.getChart(revenueCanvas) || new Chart(revenueCanvas, { type: "line", data, options });
            }
        }

        if (statusCanvas) {
            const statuses = ["Pending", "Processing", "Completed", "Cancelled"];
            const data = {
                labels: statuses,
                datasets: [{
                    label: "Saved orders",
                    data: statuses.map(status => matching.filter(order => order.status === status).length),
                    backgroundColor: ["#ffd700", "#00aeef", "#42d392", "#f47d8c"],
                    borderColor: "#101a2d",
                    borderWidth: 2
                }]
            };
            const options = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "bottom", labels: { color: "#dbeafe" } } }
            };
            if (statusChart) {
                statusChart.data = data;
                statusChart.options = options;
                statusChart.update();
            } else {
                statusChart = Chart.getChart(statusCanvas) || new Chart(statusCanvas, { type: "doughnut", data, options });
            }
        }
    }

    function refreshSalesDashboard() {
        const { value: orders, error } = readList(ordersKey, "sales orders");
        renderSummary(orders);
        renderOrders(orders);
        renderCharts(orders);
        if (error) {
            setText("salesDashboardDataNote", "Saved orders could not be read. Check browser storage; figures may be incomplete.");
        }
    }

    function setFormMessage(message) {
        setText("salesOrderFormMessage", message);
    }

    function populateCustomerOptions(selectedId) {
        const { value: customers, error } = readList(customerKey, "customers");
        const select = document.getElementById("salesOrderCustomer");
        const empty = document.getElementById("salesCustomerEmpty");
        if (!select) return false;
        select.replaceChildren(new Option("Select a customer", ""));
        if (error) {
            setFormMessage("Saved customers could not be read. Check browser storage.");
            return false;
        }
        customers.forEach(customer => select.add(new Option(customer.name || "Unnamed customer", String(customer.id))));
        if (selectedId) select.value = String(selectedId);
        else if (customers.length === 1) select.value = String(customers[0].id);
        const hasCustomers = customers.length > 0;
        select.disabled = !hasCustomers;
        if (empty) empty.hidden = hasCustomers;
        const saveButton = document.getElementById("salesSaveOrderBtn");
        if (saveButton) saveButton.disabled = !hasCustomers;
        return hasCustomers;
    }

    function openOrderForm(order) {
        const modal = document.getElementById("salesOrderModal");
        if (!modal) return;
        editingOrderId = order ? String(order.id) : null;
        const { value: customers } = readList(customerKey, "customers");
        const defaultCustomer = order?.customerId || localStorage.getItem("selectedCRMCustomer") ||
            (customers.length === 1 ? customers[0].id : "");
        populateCustomerOptions(defaultCustomer);
        document.getElementById("salesOrderFormTitle").textContent = order ? "Edit customer order" : "Create customer order";
        document.getElementById("salesSaveOrderBtn").textContent = order ? "Save changes" : "Save order";
        document.getElementById("salesOrderDetails").value = order?.details || "";
        document.getElementById("salesOrderAmount").value = order?.amount || "";
        document.getElementById("salesOrderCurrency").value = currencies.includes(order?.currency) ? order.currency : "USD";
        document.getElementById("salesOrderDate").value = order?.date || localDate();
        document.getElementById("salesOrderStatus").value = order?.status || "Pending";
        setFormMessage("");
        modal.style.display = "flex";
        modal.setAttribute("aria-hidden", "false");
        document.getElementById("salesOrderDetails").focus();
    }

    function closeOrderForm() {
        const modal = document.getElementById("salesOrderModal");
        if (modal) {
            modal.style.display = "none";
            modal.setAttribute("aria-hidden", "true");
        }
        editingOrderId = null;
    }

    function recordCustomerActivity(customer, order, action) {
        if (!Array.isArray(customer.activities)) customer.activities = [];
        const amount = formatMoney(order.amount, order.currency);
        customer.activities.unshift({
            id: `sales-${Date.now()}`,
            icon: action === "created" ? "🛒" : "📦",
            title: action === "created" ? "Sales order created" : "Sales order updated",
            description: `${order.id} · ${order.details} · ${amount} · ${order.status}`,
            date: new Date().toLocaleString()
        });
    }

    function saveOrder(event) {
        event.preventDefault();
        const orderId = document.getElementById("salesOrderCustomer").value;
        const details = document.getElementById("salesOrderDetails").value.trim();
        const amount = Number(document.getElementById("salesOrderAmount").value);
        const currency = document.getElementById("salesOrderCurrency").value;
        const date = document.getElementById("salesOrderDate").value;
        const status = document.getElementById("salesOrderStatus").value;
        if (!orderId || !details || !date || !Number.isFinite(amount) || amount <= 0 ||
            !currencies.includes(currency)) {
            setFormMessage("Select a customer and enter a description, valid date, currency and amount greater than zero.");
            return;
        }

        const { value: orders, error: ordersError } = readList(ordersKey, "sales orders");
        const { value: customers, error: customersError } = readList(customerKey, "customers");
        if (ordersError || customersError) {
            setFormMessage("Saved customer or order data could not be read, so this order was not saved.");
            return;
        }
        const customer = customers.find(item => String(item.id) === String(orderId));
        if (!customer) {
            setFormMessage("This customer is no longer available. Refresh the customer list and try again.");
            return;
        }
        const editing = editingOrderId !== null;
        const order = editing
            ? orders.find(item => String(item.id) === editingOrderId)
            : null;
        if (editing && !order) {
            setFormMessage("This order could not be found. Close the form and try again.");
            return;
        }
        const oldCustomer = editing
            ? customers.find(item => String(item.id) === String(order.customerId))
            : null;
        const previousCustomers = JSON.stringify(customers);
        const nextOrder = {
            ...(order || {}),
            id: order?.id || `SO-${Date.now()}`,
            customerId: String(customer.id),
            customerName: customer.name || "Unnamed customer",
            details,
            amount,
            currency,
            date,
            status,
            updatedAt: new Date().toISOString()
        };
        if (editing) {
            Object.assign(order, nextOrder);
        } else {
            nextOrder.createdAt = nextOrder.updatedAt;
            orders.unshift(nextOrder);
        }
        if (oldCustomer && String(oldCustomer.id) !== String(customer.id)) {
            recordCustomerActivity(oldCustomer, nextOrder, "updated");
        }
        recordCustomerActivity(customer, nextOrder, editing ? "updated" : "created");
        customer.orders = orders.filter(item =>
            String(item.customerId) === String(customer.id) && item.status !== "Cancelled"
        ).length;
        if (oldCustomer && String(oldCustomer.id) !== String(customer.id)) {
            oldCustomer.orders = orders.filter(item =>
                String(item.customerId) === String(oldCustomer.id) && item.status !== "Cancelled"
            ).length;
        }

        try {
            localStorage.setItem(customerKey, JSON.stringify(customers));
            try {
                localStorage.setItem(ordersKey, JSON.stringify(orders));
            } catch (error) {
                console.error("Unable to save sales orders:", error);
                try {
                    localStorage.setItem(customerKey, previousCustomers);
                } catch (rollbackError) {
                    console.error("Unable to restore customer records after sales save failure:", rollbackError);
                }
                setFormMessage("Order could not be saved in browser storage. Check available storage and try again.");
                return;
            }
        } catch (error) {
            console.error("Unable to save customer activity for sales order:", error);
            setFormMessage("Customer activity could not be saved. Check browser storage and try again.");
            return;
        }

        closeOrderForm();
        refreshSalesDashboard();
        window.refreshCRM?.();
        window.refreshBusinessIntelligence?.();
        if (typeof window.selectCRMCustomer === "function") {
            window.selectCRMCustomer(String(customer.id));
        }
        window.showCRMMessage?.(editing ? "Sales order updated." : "Sales order saved.");
    }

    function deleteOrder(orderId) {
        const { value: orders, error: ordersError } = readList(ordersKey, "sales orders");
        const { value: customers, error: customersError } = readList(customerKey, "customers");
        if (ordersError || customersError) {
            window.showCRMMessage?.("Saved order or customer data could not be read; no changes were made.");
            return;
        }
        const order = orders.find(item => String(item.id) === String(orderId));
        if (!order || !window.confirm(`Delete order ${order.id}?`)) return;
        const previousCustomers = JSON.stringify(customers);
        const customer = customers.find(item => String(item.id) === String(order.customerId));
        if (customer) {
            if (!Array.isArray(customer.activities)) customer.activities = [];
            customer.activities.unshift({
                id: `sales-${Date.now()}`,
                icon: "🗑",
                title: "Sales order deleted",
                description: `${order.id} · ${order.details} · ${formatMoney(order.amount, order.currency)}`,
                date: new Date().toLocaleString()
            });
            customer.orders = orders.filter(item =>
                String(item.id) !== String(order.id) &&
                String(item.customerId) === String(customer.id) &&
                item.status !== "Cancelled"
            ).length;
        }
        const nextOrders = orders.filter(item => String(item.id) !== String(orderId));
        try {
            localStorage.setItem(customerKey, JSON.stringify(customers));
            try {
                localStorage.setItem(ordersKey, JSON.stringify(nextOrders));
            } catch (error) {
                console.error("Unable to delete sales order:", error);
                try {
                    localStorage.setItem(customerKey, previousCustomers);
                } catch (rollbackError) {
                    console.error("Unable to restore customer records after sales delete failure:", rollbackError);
                }
                window.showCRMMessage?.("Order could not be deleted. Check browser storage and try again.");
                return;
            }
        } catch (error) {
            console.error("Unable to save customer activity after order deletion:", error);
            window.showCRMMessage?.("Order could not be deleted. Check browser storage and try again.");
            return;
        }
        refreshSalesDashboard();
        window.refreshCRM?.();
        window.refreshBusinessIntelligence?.();
        window.showCRMMessage?.("Sales order deleted.");
    }

    function exportOrders() {
        const { value: orders, error } = readList(ordersKey, "sales orders");
        if (error) {
            window.showCRMMessage?.("Saved orders could not be read; export was cancelled.");
            return;
        }
        if (!orders.length) {
            window.showCRMMessage?.("There are no saved orders to export yet.");
            return;
        }
        const rows = [
            ["Order ID", "Customer", "Customer ID", "Details", "Date", "Amount", "Currency", "Status"],
            ...orders.map(order => [
                order.id, order.customerName, order.customerId, order.details,
                order.date, order.amount, order.currency, order.status
            ])
        ];
        const csv = rows.map(row => row.map(value => {
            let text = String(value ?? "");
            if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
            return `"${text.replaceAll('"', '""')}"`;
        }).join(",")).join("\r\n");
        const link = document.createElement("a");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        link.href = url;
        link.download = `synvora-sales-orders-${localDate()}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }

    function handleClick(event) {
        const addButton = event.target.closest("#salesAddOrderBtn");
        if (addButton) {
            openOrderForm();
            return;
        }
        const cancelButton = event.target.closest("#salesCancelOrderBtn");
        if (cancelButton) {
            closeOrderForm();
            return;
        }
        const exportButton = event.target.closest("#salesExportOrdersBtn");
        if (exportButton) {
            exportOrders();
            return;
        }
        const actionButton = event.target.closest("[data-sales-order-action]");
        if (!actionButton) return;
        const { salesOrderAction: action, salesOrderId: id } = actionButton.dataset;
        if (action === "edit") {
            const { value: orders } = readList(ordersKey, "sales orders");
            const order = orders.find(item => String(item.id) === String(id));
            if (order) openOrderForm(order);
        }
        if (action === "delete") deleteOrder(id);
    }

    function startSalesSystem() {
        if (!document.getElementById("salesOrdersTableBody")) return;
        if (!initialized) {
            initialized = true;
            document.getElementById("salesOrderForm")?.addEventListener("submit", saveOrder);
            document.addEventListener("click", handleClick);
            ["salesPeriodFilter", "salesCurrencyFilter", "salesStatusFilter"].forEach(id => {
                document.getElementById(id)?.addEventListener("change", refreshSalesDashboard);
            });
            const overviewCurrency = document.getElementById("financeOverviewCurrency")?.value;
            const currencyFilter = document.getElementById("salesCurrencyFilter");
            if (currencies.includes(overviewCurrency) && currencyFilter) {
                currencyFilter.value = overviewCurrency;
            }
        }
        refreshSalesDashboard();
    }

    window.startSalesSystem = startSalesSystem;
    window.refreshSalesDashboard = refreshSalesDashboard;
    window.addEventListener("storage", event => {
        if (event.key === ordersKey || event.key === customerKey) refreshSalesDashboard();
    });
    document.addEventListener("crm:refresh", () => {
        const select = document.getElementById("salesOrderCustomer");
        if (select) populateCustomerOptions(select.value);
        refreshSalesDashboard();
    });
    document.addEventListener("change", event => {
        if (event.target.matches("#financeOverviewCurrency")) {
            const filter = document.getElementById("salesCurrencyFilter");
            if (filter && currencies.includes(event.target.value)) {
                filter.value = event.target.value;
                refreshSalesDashboard();
            }
        }
    });
    document.addEventListener("click", event => {
        if (!event.target.closest(".business-os-nav-btn[data-business-module-target='crm']")) return;
        requestAnimationFrame(() => setTimeout(refreshSalesDashboard, 100));
    });
})();
