"use strict";

(function () {
    const PRODUCT_KEY = "synvoraInventoryProducts";
    const MOVEMENT_KEY = "synvoraInventoryMovements";
    const CURRENCIES = new Set(["USD", "PKR", "EUR", "GBP", "AED", "SAR"]);
    const root = document.querySelector('[data-business-module="inventory"]');

    let products = [];
    let movements = [];
    let initialized = false;
    let storageReady = true;
    let editingProductId = null;
    let adjustingProductId = null;
    let lowStockOnly = false;

    function showMessage(message, isError) {
        const status = document.getElementById("inventoryStatus");
        if (!status) return;
        status.textContent = message;
        status.classList.toggle("is-error", Boolean(isError));
    }

    function readCollection(key, validateItem) {
        const raw = localStorage.getItem(key);
        if (raw === null) return [];
        const value = JSON.parse(raw);
        if (!Array.isArray(value) || value.some(item => !validateItem(item))) {
            throw new Error(`Saved inventory data in "${key}" is not valid.`);
        }
        return value;
    }

    function isProduct(item) {
        return Boolean(
            item &&
            typeof item.id === "string" &&
            typeof item.name === "string" &&
            typeof item.sku === "string" &&
            typeof item.category === "string" &&
            Number.isSafeInteger(item.stock) &&
            item.stock >= 0 &&
            Number.isSafeInteger(item.reorderLevel) &&
            item.reorderLevel >= 0 &&
            Number.isFinite(item.unitCost) &&
            item.unitCost >= 0 &&
            Number.isFinite(item.unitPrice) &&
            item.unitPrice >= 0 &&
            CURRENCIES.has(item.currency) &&
            typeof item.supplier === "string" &&
            typeof item.location === "string" &&
            typeof item.notes === "string" &&
            typeof item.createdAt === "string" &&
            typeof item.updatedAt === "string"
        );
    }

    function isMovement(item) {
        return Boolean(
            item &&
            typeof item.id === "string" &&
            typeof item.productId === "string" &&
            typeof item.productName === "string" &&
            typeof item.type === "string" &&
            Number.isSafeInteger(item.previousStock) &&
            Number.isSafeInteger(item.newStock) &&
            typeof item.reason === "string" &&
            typeof item.date === "string"
        );
    }

    function readInventory() {
        try {
            products = readCollection(PRODUCT_KEY, isProduct);
            movements = readCollection(MOVEMENT_KEY, isMovement);
            storageReady = true;
            return true;
        } catch (error) {
            storageReady = false;
            console.error("[Inventory] Could not read saved records:", error);
            showMessage("Saved inventory could not be read. Check browser storage before making changes.", true);
            return false;
        }
    }

    function saveInventory(nextProducts, nextMovements) {
        let previousProducts;
        let previousMovements;
        try {
            previousProducts = localStorage.getItem(PRODUCT_KEY);
            previousMovements = localStorage.getItem(MOVEMENT_KEY);
            localStorage.setItem(PRODUCT_KEY, JSON.stringify(nextProducts));
            localStorage.setItem(MOVEMENT_KEY, JSON.stringify(nextMovements));
            products = nextProducts;
            movements = nextMovements;
            storageReady = true;
            window.refreshBusinessIntelligence?.();
            return true;
        } catch (error) {
            try {
                if (previousProducts === null) localStorage.removeItem(PRODUCT_KEY);
                else if (previousProducts !== undefined) localStorage.setItem(PRODUCT_KEY, previousProducts);
                if (previousMovements === null) localStorage.removeItem(MOVEMENT_KEY);
                else if (previousMovements !== undefined) localStorage.setItem(MOVEMENT_KEY, previousMovements);
            } catch (rollbackError) {
                console.error("[Inventory] Could not restore inventory after a failed save:", rollbackError);
            }
            console.error("[Inventory] Could not save records:", error);
            showMessage("Inventory could not be saved. Check available browser storage and try again.", true);
            return false;
        }
    }

    function createId() {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
            return crypto.randomUUID();
        }
        return `inventory-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }

    function formatCurrency(amount, currency) {
        return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency,
            maximumFractionDigits: 2
        }).format(amount);
    }

    function formatDate(value) {
        const date = new Date(value);
        return Number.isNaN(date.getTime())
            ? "—"
            : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
    }

    function getStockStatus(product) {
        if (product.stock <= 0) return { label: "Out of stock", className: "is-out-of-stock" };
        if (product.stock <= product.reorderLevel) return { label: "Low stock", className: "is-low-stock" };
        return { label: "In stock", className: "is-in-stock" };
    }

    function updateSummary() {
        const lowStockCount = products.filter(product => {
            const status = getStockStatus(product);
            return status.className === "is-low-stock";
        }).length;
        const outOfStockCount = products.filter(product => product.stock === 0).length;
        document.getElementById("inventoryTotalProducts").textContent = products.length.toLocaleString();
        document.getElementById("inventoryLowStock").textContent = lowStockCount.toLocaleString();
        document.getElementById("inventoryOutOfStock").textContent = outOfStockCount.toLocaleString();

        const supplierNames = new Set(
            products.map(product => product.supplier.trim().toLocaleLowerCase()).filter(Boolean)
        );
        document.getElementById("inventorySupplierCount").textContent = supplierNames.size.toLocaleString();

        const totalsByCurrency = new Map();
        products.forEach(product => {
            totalsByCurrency.set(
                product.currency,
                (totalsByCurrency.get(product.currency) || 0) + product.stock * product.unitCost
            );
        });
        const value = document.getElementById("inventoryStockValue");
        const valueNote = document.getElementById("inventoryStockValueNote");
        if (totalsByCurrency.size === 0) {
            value.textContent = "—";
            valueNote.textContent = "Add saved products to calculate stock cost value";
        } else {
            value.textContent = Array.from(totalsByCurrency, ([currency, amount]) => (
                formatCurrency(amount, currency)
            )).join(" · ");
            valueNote.textContent = "Quantity on hand × unit cost · grouped by currency";
        }

        const overviewProducts = document.getElementById("inventoryOverviewProducts");
        if (overviewProducts) overviewProducts.textContent = products.length.toLocaleString();
        const overviewLowStock = document.getElementById("inventoryOverviewLowStock");
        if (overviewLowStock) {
            overviewLowStock.textContent = products.length === 0
                ? "No saved products yet"
                : `${(lowStockCount + outOfStockCount).toLocaleString()} need${lowStockCount + outOfStockCount === 1 ? "s" : ""} restocking`;
        }
        const overviewAdvisor = document.getElementById("inventoryOverviewAdvisor");
        if (overviewAdvisor) {
            overviewAdvisor.textContent = products.length === 0
                ? "Add inventory records to see stock health based on your saved products."
                : lowStockCount + outOfStockCount === 0
                    ? "No products are currently at or below their reorder level."
                    : `${(lowStockCount + outOfStockCount).toLocaleString()} saved product${lowStockCount + outOfStockCount === 1 ? "" : "s"} are at or below their reorder level.`;
        }
        const reportProducts = document.getElementById("inventoryReportProducts");
        if (reportProducts) reportProducts.textContent = products.length.toLocaleString();
        const reportLowStock = document.getElementById("inventoryReportLowStock");
        if (reportLowStock) {
            reportLowStock.textContent = products.length === 0
                ? "No saved inventory records"
                : `${(lowStockCount + outOfStockCount).toLocaleString()} at or below reorder level`;
        }
        const notification = document.getElementById("inventoryNotificationMessage");
        if (notification) {
            const restockProducts = products.filter(product => product.stock <= product.reorderLevel);
            notification.textContent = products.length === 0
                ? "No saved products to assess for reorder levels."
                : restockProducts.length === 0
                    ? "No saved products are currently at or below their reorder level."
                    : `${restockProducts.length.toLocaleString()} product${restockProducts.length === 1 ? "" : "s"} need restocking: ${restockProducts.slice(0, 3).map(product => product.name).join(", ")}${restockProducts.length > 3 ? ", and more" : ""}.`;
        }
    }

    function updateCategoryOptions() {
        const filter = document.getElementById("inventoryCategoryFilter");
        const datalist = document.getElementById("inventoryCategoryOptions");
        if (!filter || !datalist) return;
        const selected = filter.value;
        const categories = Array.from(new Set(products.map(product => product.category.trim()).filter(Boolean)))
            .sort((a, b) => a.localeCompare(b));

        filter.replaceChildren(new Option("All categories", ""));
        datalist.replaceChildren();
        categories.forEach(category => {
            filter.add(new Option(category, category));
            const option = document.createElement("option");
            option.value = category;
            datalist.append(option);
        });
        filter.value = categories.includes(selected) ? selected : "";
    }

    function filteredProducts() {
        const query = document.getElementById("inventorySearch").value.trim().toLocaleLowerCase();
        const category = document.getElementById("inventoryCategoryFilter").value;
        return products.filter(product => {
            const matchesQuery = !query || [
                product.name,
                product.sku,
                product.category,
                product.supplier,
                product.location
            ].some(value => value.toLocaleLowerCase().includes(query));
            const matchesCategory = !category || product.category === category;
            const matchesStock = !lowStockOnly || getStockStatus(product).className !== "is-in-stock";
            return matchesQuery && matchesCategory && matchesStock;
        });
    }

    function appendTextCell(row, value, className) {
        const cell = document.createElement("td");
        cell.textContent = value;
        if (className) cell.className = className;
        row.append(cell);
        return cell;
    }

    function createRowAction(label, action, product) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.inventoryAction = action;
        button.dataset.productId = product.id;
        button.textContent = label;
        button.setAttribute("aria-label", `${label} ${product.name}`);
        return button;
    }

    function renderProducts() {
        const body = document.getElementById("inventoryTableBody");
        const emptyState = document.getElementById("inventoryEmptyState");
        const visibleProducts = filteredProducts();
        body.replaceChildren();

        visibleProducts.forEach(product => {
            const row = document.createElement("tr");
            row.dataset.productId = product.id;

            const nameCell = document.createElement("td");
            const name = document.createElement("span");
            name.className = "inventory-product-name";
            name.textContent = product.name;
            const category = document.createElement("span");
            category.className = "inventory-product-category";
            category.textContent = product.category;
            nameCell.append(name, category);
            row.append(nameCell);

            const sku = appendTextCell(row, product.sku, "inventory-sku");
            sku.title = product.sku;

            const stockCell = document.createElement("td");
            const stock = document.createElement("span");
            stock.className = "inventory-number";
            stock.textContent = product.stock.toLocaleString();
            const reorder = document.createElement("span");
            reorder.className = "inventory-cell-subtext";
            reorder.textContent = `Reorder at ${product.reorderLevel.toLocaleString()}`;
            stockCell.append(stock, reorder);
            row.append(stockCell);

            appendTextCell(row, formatCurrency(product.unitPrice, product.currency), "inventory-number");
            appendTextCell(row, formatCurrency(product.unitCost * product.stock, product.currency), "inventory-number");

            const supplierCell = document.createElement("td");
            const supplier = document.createElement("span");
            supplier.textContent = product.supplier || "—";
            const location = document.createElement("span");
            location.className = "inventory-cell-subtext";
            location.textContent = product.location || "No location";
            supplierCell.append(supplier, location);
            row.append(supplierCell);

            const statusCell = document.createElement("td");
            const status = getStockStatus(product);
            const badge = document.createElement("span");
            badge.className = `inventory-stock-badge ${status.className}`;
            badge.textContent = status.label;
            statusCell.append(badge);
            row.append(statusCell);

            appendTextCell(row, formatDate(product.updatedAt));

            const actionsCell = document.createElement("td");
            const actions = document.createElement("div");
            actions.className = "inventory-row-actions";
            actions.append(
                createRowAction("Edit", "edit", product),
                createRowAction("Adjust", "adjust", product),
                createRowAction("Delete", "delete", product)
            );
            actionsCell.append(actions);
            row.append(actionsCell);
            body.append(row);
        });

        document.getElementById("inventoryResultCount").textContent =
            `${visibleProducts.length.toLocaleString()} of ${products.length.toLocaleString()} products`;
        emptyState.hidden = visibleProducts.length > 0;
        document.getElementById("inventoryEmptyTitle").textContent =
            products.length === 0 ? "No products yet" : "No matching products";
        document.getElementById("inventoryEmptyMessage").textContent =
            products.length === 0
                ? "Add your first product to see live inventory levels and stock value here."
                : "Try changing the search, category or low-stock filter.";
    }

    function renderMovements() {
        const list = document.getElementById("inventoryMovementList");
        const sorted = [...movements].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
        list.replaceChildren();
        document.getElementById("inventoryMovementCount").textContent =
            movements.length === 0 ? "No movements recorded" : `${movements.length.toLocaleString()} recorded`;

        if (sorted.length === 0) {
            const empty = document.createElement("p");
            empty.className = "inventory-no-movements";
            empty.textContent = "Stock receipts and adjustments will appear here.";
            list.append(empty);
            return;
        }

        sorted.forEach(movement => {
            const item = document.createElement("article");
            item.className = "inventory-movement-item";
            const details = document.createElement("div");
            const title = document.createElement("strong");
            title.textContent = movement.productName;
            const description = document.createElement("small");
            description.textContent = `${movement.type} · ${movement.reason} · ${formatDate(movement.date)}`;
            details.append(title, description);
            const quantity = document.createElement("span");
            quantity.className = `inventory-movement-quantity${movement.newStock < movement.previousStock ? " is-negative" : ""}`;
            quantity.textContent = `${movement.previousStock.toLocaleString()} → ${movement.newStock.toLocaleString()}`;
            item.append(details, quantity);
            list.append(item);
        });
    }

    function refreshInventory() {
        updateSummary();
        updateCategoryOptions();
        renderProducts();
        renderMovements();
    }

    function openProductDialog(productId) {
        if (!storageReady) {
            showMessage("Inventory is read-only until saved data can be read.", true);
            return;
        }
        const form = document.getElementById("inventoryProductForm");
        const product = productId ? products.find(item => item.id === productId) : null;
        if (productId && !product) {
            showMessage("That product could not be found. Refresh the inventory list and try again.", true);
            return;
        }
        editingProductId = product ? product.id : null;
        form.reset();
        form.elements.namedItem("reorderLevel").value = product ? product.reorderLevel : "5";
        form.elements.namedItem("currency").value = product ? product.currency : "USD";
        document.getElementById("inventoryProductModalTitle").textContent = product ? "Edit product" : "Add product";
        document.getElementById("inventoryProductFormMessage").textContent = "";
        if (product) {
            ["name", "sku", "category", "stock", "unitCost", "unitPrice", "supplier", "location", "notes"].forEach(name => {
                form.elements.namedItem(name).value = product[name] ?? "";
            });
        }
        document.getElementById("inventoryProductModal").showModal();
        form.elements.namedItem("name").focus();
    }

    function closeDialog(dialogId) {
        const dialog = document.getElementById(dialogId);
        if (dialog.open) dialog.close();
    }

    function showFormError(elementId, message) {
        document.getElementById(elementId).textContent = message;
    }

    function createMovement(product, type, previousStock, newStock, reason) {
        return {
            id: createId(),
            productId: product.id,
            productName: product.name,
            type,
            previousStock,
            newStock,
            reason,
            date: new Date().toISOString()
        };
    }

    function handleProductSubmit(event) {
        event.preventDefault();
        if (!storageReady) {
            showFormError("inventoryProductFormMessage", "Inventory data could not be read. No changes were saved.");
            return;
        }

        const form = event.currentTarget;
        const values = new FormData(form);
        const name = String(values.get("name") || "").trim();
        const sku = String(values.get("sku") || "").trim().toUpperCase();
        const category = String(values.get("category") || "").trim();
        const stock = Number(values.get("stock"));
        const reorderLevel = Number(values.get("reorderLevel"));
        const unitCost = Number(values.get("unitCost"));
        const unitPrice = Number(values.get("unitPrice"));
        const currency = String(values.get("currency") || "");

        if (!name || !sku || !category || !Number.isSafeInteger(stock) || stock < 0 ||
            !Number.isSafeInteger(reorderLevel) || reorderLevel < 0 ||
            !Number.isFinite(unitCost) || unitCost < 0 ||
            !Number.isFinite(unitPrice) || unitPrice < 0 ||
            !CURRENCIES.has(currency)) {
            showFormError("inventoryProductFormMessage", "Check the required fields, quantity, prices and currency.");
            return;
        }
        const duplicate = products.some(product =>
            product.sku.toLocaleLowerCase() === sku.toLocaleLowerCase() &&
            product.id !== editingProductId
        );
        if (duplicate) {
            showFormError("inventoryProductFormMessage", "That SKU is already used by another product.");
            return;
        }

        const existing = editingProductId
            ? products.find(product => product.id === editingProductId)
            : null;
        if (editingProductId && !existing) {
            showFormError("inventoryProductFormMessage", "That product could not be found. Close this form and try again.");
            return;
        }
        const now = new Date().toISOString();
        const product = {
            id: existing ? existing.id : createId(),
            name,
            sku,
            category,
            stock,
            reorderLevel,
            unitCost,
            unitPrice,
            currency,
            supplier: String(values.get("supplier") || "").trim(),
            location: String(values.get("location") || "").trim(),
            notes: String(values.get("notes") || "").trim(),
            createdAt: existing ? existing.createdAt : now,
            updatedAt: now
        };
        const nextProducts = existing
            ? products.map(item => item.id === existing.id ? product : item)
            : [...products, product];
        const nextMovements = [...movements];
        if (existing && existing.stock !== product.stock) {
            nextMovements.unshift(createMovement(
                product,
                "Product stock edited",
                existing.stock,
                product.stock,
                "Quantity changed while editing product"
            ));
        } else if (!existing && product.stock > 0) {
            nextMovements.unshift(createMovement(
                product,
                "Initial stock recorded",
                0,
                product.stock,
                "Initial product entry"
            ));
        }

        if (!saveInventory(nextProducts, nextMovements)) {
            showFormError("inventoryProductFormMessage", "The product was not saved. Check browser storage and try again.");
            return;
        }
        closeDialog("inventoryProductModal");
        refreshInventory();
        showMessage(existing ? "Product updated." : "Product added.");
    }

    function openAdjustmentDialog(productId) {
        if (!storageReady) {
            showMessage("Inventory is read-only until saved data can be read.", true);
            return;
        }
        const product = products.find(item => item.id === productId);
        if (!product) {
            showMessage("That product could not be found. Refresh the inventory list and try again.", true);
            return;
        }
        adjustingProductId = product.id;
        document.getElementById("inventoryAdjustmentForm").reset();
        document.getElementById("inventoryAdjustmentProductName").textContent =
            `${product.name} · current stock ${product.stock.toLocaleString()}`;
        document.getElementById("inventoryAdjustmentFormMessage").textContent = "";
        document.getElementById("inventoryAdjustmentModal").showModal();
        document.getElementById("inventoryAdjustmentForm").elements.namedItem("mode").focus();
    }

    function handleAdjustmentSubmit(event) {
        event.preventDefault();
        if (!storageReady) {
            showFormError("inventoryAdjustmentFormMessage", "Inventory data could not be read. No changes were saved.");
            return;
        }
        const product = products.find(item => item.id === adjustingProductId);
        if (!product) {
            showFormError("inventoryAdjustmentFormMessage", "That product could not be found. Close this form and try again.");
            return;
        }
        const values = new FormData(event.currentTarget);
        const mode = String(values.get("mode") || "");
        const quantity = Number(values.get("quantity"));
        const reason = String(values.get("reason") || "").trim();
        if (!["add", "remove", "set"].includes(mode) ||
            !Number.isInteger(quantity) || quantity < 0 ||
            (mode !== "set" && quantity === 0) || !reason) {
            showFormError("inventoryAdjustmentFormMessage", "Enter a whole quantity and a reason for this stock change.");
            return;
        }
        const newStock = mode === "add"
            ? product.stock + quantity
            : mode === "remove"
                ? product.stock - quantity
                : quantity;
        if (newStock < 0) {
            showFormError("inventoryAdjustmentFormMessage", "Stock cannot be reduced below zero.");
            return;
        }
        if (!Number.isSafeInteger(newStock)) {
            showFormError("inventoryAdjustmentFormMessage", "The resulting stock quantity is too large.");
            return;
        }
        if (newStock === product.stock) {
            showFormError("inventoryAdjustmentFormMessage", "This adjustment would not change the stock quantity.");
            return;
        }

        const updatedProduct = { ...product, stock: newStock, updatedAt: new Date().toISOString() };
        const type = mode === "add" ? "Stock received" : mode === "remove" ? "Stock removed" : "Stock count set";
        const movement = createMovement(updatedProduct, type, product.stock, newStock, reason);
        if (!saveInventory(
            products.map(item => item.id === product.id ? updatedProduct : item),
            [movement, ...movements]
        )) {
            showFormError("inventoryAdjustmentFormMessage", "The adjustment was not saved. Check browser storage and try again.");
            return;
        }
        closeDialog("inventoryAdjustmentModal");
        refreshInventory();
        showMessage("Stock adjustment saved.");
    }

    function deleteProduct(productId) {
        if (!storageReady) {
            showMessage("Inventory is read-only until saved data can be read.", true);
            return;
        }
        const product = products.find(item => item.id === productId);
        if (!product) {
            showMessage("That product could not be found. Refresh the inventory list and try again.", true);
            return;
        }
        if (!window.confirm(`Delete "${product.name}" from inventory? This action cannot be undone.`)) return;
        const movement = createMovement(product, "Product deleted", product.stock, 0, "Product record deleted");
        if (!saveInventory(
            products.filter(item => item.id !== product.id),
            [movement, ...movements]
        )) return;
        refreshInventory();
        showMessage("Product deleted.");
    }

    function exportProducts() {
        if (!storageReady) {
            showMessage("Inventory could not be read, so no export was created.", true);
            return;
        }
        const rows = filteredProducts();
        if (rows.length === 0) {
            showMessage("There are no matching products to export.", true);
            return;
        }
        const headings = [
            "Product", "SKU", "Category", "Quantity", "Reorder level",
            "Unit cost", "Unit selling price", "Currency", "Stock cost value",
            "Supplier", "Location", "Notes", "Last updated"
        ];
        const quote = value => {
            const text = String(value ?? "");
            const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
            return `"${safeText.replace(/"/g, '""')}"`;
        };
        const data = rows.map(product => [
            product.name, product.sku, product.category, product.stock, product.reorderLevel,
            product.unitCost, product.unitPrice, product.currency, product.unitCost * product.stock,
            product.supplier, product.location, product.notes, product.updatedAt
        ]);
        const csv = [headings, ...data].map(row => row.map(quote).join(",")).join("\r\n");
        try {
            const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.append(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            showMessage(`Exported ${rows.length.toLocaleString()} product${rows.length === 1 ? "" : "s"}.`);
        } catch (error) {
            console.error("[Inventory] Could not export products:", error);
            showMessage("The inventory export could not be created in this browser.", true);
        }
    }

    function handleAction(event) {
        if (!(event.target instanceof Element)) return;
        const button = event.target.closest("[data-inventory-action]");
        if (!button || !root.contains(button)) return;
        const action = button.dataset.inventoryAction;

        if (action === "add") openProductDialog();
        if (action === "close-product") closeDialog("inventoryProductModal");
        if (action === "close-adjustment") closeDialog("inventoryAdjustmentModal");
        if (action === "edit") openProductDialog(button.dataset.productId);
        if (action === "adjust") openAdjustmentDialog(button.dataset.productId);
        if (action === "delete") deleteProduct(button.dataset.productId);
        if (action === "export") exportProducts();
        if (action === "toggle-low-stock") {
            lowStockOnly = !lowStockOnly;
            button.setAttribute("aria-pressed", String(lowStockOnly));
            renderProducts();
        }
    }

    function initInventoryManagement() {
        if (initialized) {
            readInventory();
            refreshInventory();
            return;
        }
        if (!root || !document.getElementById("inventoryProductForm") ||
            !document.getElementById("inventoryTableBody")) {
            console.error("[Inventory] Dashboard or product directory did not load.");
            return;
        }

        initialized = true;
        root.addEventListener("click", handleAction);
        document.getElementById("inventoryProductForm").addEventListener("submit", handleProductSubmit);
        document.getElementById("inventoryAdjustmentForm").addEventListener("submit", handleAdjustmentSubmit);
        document.getElementById("inventorySearch").addEventListener("input", renderProducts);
        document.getElementById("inventoryCategoryFilter").addEventListener("change", renderProducts);
        window.addEventListener("storage", event => {
            if (event.key !== PRODUCT_KEY && event.key !== MOVEMENT_KEY) return;
            if (readInventory()) {
                refreshInventory();
                showMessage("Inventory was updated in another browser tab.");
            }
        });

        if (readInventory()) {
            refreshInventory();
            showMessage(products.length === 0
                ? "No saved products yet. Add a product to start tracking inventory."
                : "Inventory is up to date using your saved product records.");
        } else {
            refreshInventory();
        }
    }

    window.initInventoryManagement = initInventoryManagement;
    window.refreshInventoryManagement = function () {
        if (!initialized) return;
        if (readInventory()) refreshInventory();
    };
})();
