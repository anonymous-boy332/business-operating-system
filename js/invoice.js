"use strict";

let invoices = [];
let editInvoiceId = null;
let invoiceInitialized = false;
let invoiceStorageError = null;

function loadInvoices() {
    invoiceStorageError = null;
    try {
        const stored = JSON.parse(localStorage.getItem("invoices") || "[]");
        if (!Array.isArray(stored)) {
            throw new TypeError("Expected invoice records to be a list.");
        }
        invoices = stored;
    } catch (error) {
        console.error("Unable to load invoices:", error);
        invoiceStorageError = error;
        invoices = [];
    }
}

function invoiceLocalDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function invoiceCurrency(value) {
    const supported = ["USD", "PKR", "EUR", "GBP", "AED", "SAR"];
    return supported.includes(value) ? value : "USD";
}

function formatInvoiceAmount(amount, currencyCode = "USD") {
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: invoiceCurrency(currencyCode)
    }).format(Number(amount) || 0);
}

function formatInvoiceTotals(records, predicate = () => true) {
    const totals = new Map();
    records.filter(predicate).forEach(record => {
        const code = invoiceCurrency(record.currency);
        totals.set(code, (totals.get(code) || 0) + (Number(record.amount) || 0));
    });
    if (!totals.size) return formatInvoiceAmount(0);
    return [...totals.entries()]
        .map(([code, amount]) => formatInvoiceAmount(amount, code))
        .join(" · ");
}

function initInvoice() {
    if (invoiceInitialized) return;
    const form = document.getElementById("invoiceForm");
    const modal = document.getElementById("invoiceModal");
    if (!form || !modal) return;

    invoiceInitialized = true;
    loadInvoices();

    document.querySelector(".add-invoice-btn")?.addEventListener("click", openInvoiceForm);
    document.getElementById("closeInvoice")?.addEventListener("click", closeInvoiceForm);
    document.getElementById("cancelInvoice")?.addEventListener("click", closeInvoiceForm);
    document.getElementById("exportInvoices")?.addEventListener("click", exportInvoices);

    form.addEventListener("submit", event => {
        event.preventDefault();
        saveInvoice();
    });

    document.querySelector(".invoice-table tbody")?.addEventListener("click", event => {
        const button = event.target.closest("[data-invoice-action]");
        if (!button) return;
        const id = button.dataset.invoiceId;
        if (button.dataset.invoiceAction === "edit") editInvoice(id);
        if (button.dataset.invoiceAction === "delete") deleteInvoice(id);
    });

    displayInvoices();
    updateInvoiceSummary();
    window.openInvoiceForm = openInvoiceForm;
}

function openInvoiceForm() {
    const modal = document.getElementById("invoiceModal");
    const form = document.getElementById("invoiceForm");
    if (!modal || !form) return;
    if (editInvoiceId === null) {
        form.reset();
        document.getElementById("invoiceDate").value = invoiceLocalDate();
        document.getElementById("invoiceStatus").value = "Pending";
        document.getElementById("invoiceFormTitle").textContent = "Create invoice";
        document.getElementById("saveInvoice").textContent = "Save invoice";
    }
    document.getElementById("invoiceFormMessage").textContent = "";
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
    document.getElementById("invoiceCustomer").focus();
}

function closeInvoiceForm() {
    const modal = document.getElementById("invoiceModal");
    if (modal) {
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
    }
    editInvoiceId = null;
}

function saveInvoice() {
    const customer = document.getElementById("invoiceCustomer").value.trim();
    const amount = Number(document.getElementById("invoiceAmount").value);
    const currency = invoiceCurrency(document.getElementById("invoiceCurrency").value);
    const date = document.getElementById("invoiceDate").value;
    const status = document.getElementById("invoiceStatus").value;
    const message = document.getElementById("invoiceFormMessage");

    if (!customer || !date || !Number.isFinite(amount) || amount <= 0) {
        message.textContent = "Enter a customer, due date and amount greater than zero.";
        return;
    }

    const previous = invoices.map(item => ({ ...item }));
    if (editInvoiceId !== null) {
        const invoice = invoices.find(item => String(item.id) === String(editInvoiceId));
        if (!invoice) {
            message.textContent = "This invoice could not be found. Close the form and try again.";
            return;
        }
        Object.assign(invoice, { customer, amount, currency, date, status });
    } else {
        invoices.push({ id: Date.now(), customer, amount, currency, date, status });
    }

    if (!saveInvoices()) {
        invoices = previous;
        message.textContent = "Could not save this invoice in this browser. Check available storage and try again.";
        return;
    }

    displayInvoices();
    updateInvoiceSummary();
    window.refreshFinanceOverview?.();
    window.refreshBusinessIntelligence?.();
    document.getElementById("invoiceForm").reset();
    closeInvoiceForm();
}

function saveInvoices() {
    if (invoiceStorageError) {
        console.error("Refusing to overwrite unreadable invoice data.");
        return false;
    }
    try {
        localStorage.setItem("invoices", JSON.stringify(invoices));
        return true;
    } catch (error) {
        console.error("Unable to save invoices:", error);
        return false;
    }
}

function displayInvoices() {
    const table = document.querySelector(".invoice-table tbody");
    if (!table) return;
    table.replaceChildren();

    invoices.forEach(invoice => {
        const row = document.createElement("tr");
        const values = [
            `INV-${invoice.id}`,
            invoice.customer || "—",
            invoice.date || "—",
            formatInvoiceAmount(invoice.amount, invoice.currency)
        ];
        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.append(cell);
        });

        const statusCell = document.createElement("td");
        const status = document.createElement("span");
        status.className = `status ${String(invoice.status || "").toLowerCase()}`;
        status.textContent = invoice.status || "Pending";
        statusCell.append(status);
        row.append(statusCell);

        const actions = document.createElement("td");
        [
            ["edit", "Edit"],
            ["delete", "Delete"]
        ].forEach(([action, label]) => {
            const button = document.createElement("button");
            button.type = "button";
            button.dataset.invoiceAction = action;
            button.dataset.invoiceId = String(invoice.id);
            button.textContent = label;
            actions.append(button);
        });
        row.append(actions);
        table.append(row);
    });

    const emptyState = document.getElementById("invoiceEmptyState");
    if (emptyState) emptyState.hidden = invoices.length > 0;
}

function editInvoice(id) {
    const invoice = invoices.find(item => String(item.id) === String(id));
    if (!invoice) return;
    editInvoiceId = invoice.id;
    document.getElementById("invoiceCustomer").value = invoice.customer || "";
    document.getElementById("invoiceAmount").value = invoice.amount || "";
    document.getElementById("invoiceCurrency").value = invoiceCurrency(invoice.currency);
    document.getElementById("invoiceDate").value = invoice.date || "";
    document.getElementById("invoiceStatus").value = invoice.status || "Pending";
    document.getElementById("invoiceFormTitle").textContent = "Edit invoice";
    document.getElementById("saveInvoice").textContent = "Save changes";
    openInvoiceForm();
}

function deleteInvoice(id) {
    const invoice = invoices.find(item => String(item.id) === String(id));
    if (!invoice || !window.confirm(`Delete invoice INV-${invoice.id}?`)) return;
    const previous = invoices;
    invoices = invoices.filter(item => String(item.id) !== String(id));
    if (!saveInvoices()) {
        invoices = previous;
        window.alert("Could not delete the invoice. Check browser storage and try again.");
        return;
    }
    displayInvoices();
    updateInvoiceSummary();
    window.refreshFinanceOverview?.();
    window.refreshBusinessIntelligence?.();
}

function updateInvoiceSummary() {
    const total = document.getElementById("totalInvoice");
    const paid = document.getElementById("paidInvoice");
    const pending = document.getElementById("pendingInvoice");
    if (total) total.textContent = formatInvoiceTotals(invoices);
    if (paid) paid.textContent = formatInvoiceTotals(invoices, invoice => invoice.status === "Paid");
    if (pending) pending.textContent = formatInvoiceTotals(invoices, invoice => invoice.status === "Pending");
}

function refreshInvoices() {
    if (!invoiceInitialized) return;
    loadInvoices();
    displayInvoices();
    updateInvoiceSummary();
}

function exportInvoices() {
    if (!invoices.length) {
        window.alert("There are no saved invoices to export yet.");
        return;
    }
    const rows = [
        ["Invoice", "Customer", "Due date", "Amount", "Currency", "Status"],
        ...invoices.map(item => [item.id, item.customer, item.date, item.amount, invoiceCurrency(item.currency), item.status])
    ];
    const csv = rows.map(row => row.map(value =>
        csvSafeInvoiceValue(value)
    ).join(",")).join("\r\n");
    const link = document.createElement("a");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.href = url;
    link.download = `synvora-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

function csvSafeInvoiceValue(value) {
    let text = String(value ?? "");
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
}

window.initInvoice = initInvoice;
window.refreshInvoices = refreshInvoices;

window.addEventListener("storage", event => {
    if (event.key === "invoices") {
        loadInvoices();
        displayInvoices();
        updateInvoiceSummary();
        window.refreshFinanceOverview?.();
    }
});
