/* =========================================================
   SYNVORA AI — COMPANY MANAGEMENT
   Complete Replacement
   Features:
   - Create / Edit / View / Delete Companies
   - Active Workspace Selection
   - Active / Inactive Status
   - Search and Status Filters
   - Company Statistics
   - LocalStorage Persistence
========================================================= */

(function () {
    "use strict";

    /* =====================================================
       CONFIGURATION
    ===================================================== */

    const COMPANIES_KEY = "synvoraCompanies";
    const ACTIVE_COMPANY_KEY = "synvoraActiveCompany";

    let companies = [];
    let editingCompanyId = null;
    let initializationStarted = false;
    let initializationAttempts = 0;

    const MAX_INITIALIZATION_ATTEMPTS = 30;
    const INITIALIZATION_INTERVAL = 300;


    /* =====================================================
       BASIC HELPERS
    ===================================================== */

    function getElement(id) {
        return document.getElementById(id);
    }

    function getValue(id) {
        const element = getElement(id);
        return element ? element.value.trim() : "";
    }

    function setText(id, value) {
        const element = getElement(id);

        if (element) {
            element.textContent =
                value === undefined || value === null
                    ? ""
                    : String(value);
        }
    }

    function setInputValue(id, value) {
        const element = getElement(id);

        if (element) {
            element.value =
                value === undefined || value === null
                    ? ""
                    : String(value);
        }
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (character) {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return entities[character];
        });
    }

    function generateCompanyId() {
        if (
            typeof crypto !== "undefined" &&
            typeof crypto.randomUUID === "function"
        ) {
            return "company_" + crypto.randomUUID();
        }

        return (
            "company_" +
            Date.now() +
            "_" +
            Math.random().toString(36).slice(2, 10)
        );
    }

    function normalizeStatus(status) {
        return String(status || "Active").toLowerCase() === "inactive"
            ? "Inactive"
            : "Active";
    }

    function formatCurrency(amount, currency) {
        const numericAmount = Number(amount) || 0;
        const currencyCode = String(currency || "PKR").toUpperCase();

        try {
            return new Intl.NumberFormat("en", {
                style: "currency",
                currency: currencyCode,
                maximumFractionDigits: 2
            }).format(numericAmount);
        } catch (error) {
            return currencyCode + " " + numericAmount.toLocaleString();
        }
    }

    function showNotice(message, type) {
        const noticeType = type || "info";

        let notice = getElement("companyManagementNotice");

        if (!notice) {
            notice = document.createElement("div");
            notice.id = "companyManagementNotice";

            Object.assign(notice.style, {
                position: "fixed",
                right: "24px",
                top: "24px",
                zIndex: "999999",
                maxWidth: "380px",
                padding: "14px 20px",
                borderRadius: "12px",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: "600",
                boxShadow: "0 12px 35px rgba(0,0,0,0.3)",
                transition: "opacity 0.2s ease",
                display: "none"
            });

            document.body.appendChild(notice);
        }

        const backgrounds = {
            success: "#147d50",
            error: "#b83232",
            warning: "#9a6700",
            info: "#174e7a"
        };

        notice.style.background =
            backgrounds[noticeType] || backgrounds.info;

        notice.textContent = message;
        notice.style.display = "block";
        notice.style.opacity = "1";

        if (notice._hideTimer) {
            clearTimeout(notice._hideTimer);
        }

        notice._hideTimer = setTimeout(function () {
            notice.style.opacity = "0";

            setTimeout(function () {
                notice.style.display = "none";
            }, 250);
        }, 3200);
    }


    /* =====================================================
       LOCAL STORAGE
    ===================================================== */

    function getStoredCompanies() {
        try {
            const stored = localStorage.getItem(COMPANIES_KEY);

            if (!stored) {
                return [];
            }

            const parsed = JSON.parse(stored);

            if (!Array.isArray(parsed)) {
                console.error(
                    "Synvora AI: Company storage is not an array."
                );

                return [];
            }

            return parsed.map(function (company) {
                return normalizeCompany(company);
            });
        } catch (error) {
            console.error(
                "Synvora AI: Could not read company storage.",
                error
            );

            return [];
        }
    }

    function normalizeCompany(company) {
        const item = company && typeof company === "object"
            ? company
            : {};

        return {
            id: String(item.id || generateCompanyId()),
            name: String(item.name || item.companyName || "Unnamed Company"),
            code: String(item.code || ""),
            type: String(item.type || ""),
            industry: String(item.industry || ""),
            owner: String(item.owner || ""),
            email: String(item.email || ""),
            phone: String(item.phone || ""),
            website: String(item.website || ""),
            country: String(item.country || ""),
            currency: String(item.currency || "PKR"),
            taxId: String(item.taxId || ""),
            fiscalYear: String(item.fiscalYear || ""),
            status: normalizeStatus(item.status),
            address: String(item.address || ""),
            description: String(item.description || ""),
            employees: Math.max(0, Number(item.employees) || 0),
            revenue: Number(item.revenue) || 0,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || item.createdAt || new Date().toISOString()
        };
    }

    function saveCompanyStorage() {
        try {
            localStorage.setItem(
                COMPANIES_KEY,
                JSON.stringify(companies)
            );

            return true;
        } catch (error) {
            console.error(
                "Synvora AI: Could not save companies.",
                error
            );

            showNotice(
                "Company data could not be saved. Check browser storage.",
                "error"
            );

            return false;
        }
    }

    function getActiveCompanyId() {
        try {
            const stored = localStorage.getItem(ACTIVE_COMPANY_KEY);

            if (!stored) {
                return "";
            }

            // Supports both legacy string IDs and object storage.
            try {
                const parsed = JSON.parse(stored);

                if (parsed && typeof parsed === "object") {
                    return String(parsed.id || "");
                }

                if (typeof parsed === "string") {
                    return parsed;
                }
            } catch (error) {
                // Legacy value may be a plain company ID.
            }

            return stored;
        } catch (error) {
            console.error(
                "Synvora AI: Could not read active company.",
                error
            );

            return "";
        }
    }

    function getActiveCompany() {
        const activeId = getActiveCompanyId();

        if (!activeId) {
            return null;
        }

        return companies.find(function (company) {
            return String(company.id) === String(activeId);
        }) || null;
    }

    function setActiveCompany(companyOrId) {
        let company = null;

        if (companyOrId && typeof companyOrId === "object") {
            company = companies.find(function (item) {
                return String(item.id) === String(companyOrId.id);
            }) || null;
        } else {
            company = companies.find(function (item) {
                return String(item.id) === String(companyOrId);
            }) || null;
        }

        if (!company) {
            try {
                localStorage.removeItem(ACTIVE_COMPANY_KEY);
                localStorage.removeItem("synvoraActiveCompanyId");
            } catch (error) {
                console.error(error);
            }

            window.SynvoraCompanyScope?.notifyCompanyChange();
            updateActiveCompanyWorkspace();
            return false;
        }

        try {
            // Store the ID only. The complete company remains in
            // synvoraCompanies, avoiding stale active-company objects.
            localStorage.setItem(
                ACTIVE_COMPANY_KEY,
                String(company.id)
            );
            localStorage.setItem(
                "synvoraActiveCompanyId",
                String(company.id)
            );
        } catch (error) {
            console.error(
                "Synvora AI: Could not save active company.",
                error
            );

            showNotice("Could not save the active workspace.", "error");
            return false;
        }

        window.SynvoraCompanyScope?.notifyCompanyChange();
        updateActiveCompanyWorkspace();

        return true;
    }


    /* =====================================================
       COMPANY FORM
    ===================================================== */

    function openCompanyModal(companyId) {
        editingCompanyId = companyId || null;

        const modal = getElement("companyModal");

        if (!modal) {
            showNotice(
                "Company form was not found in the loaded HTML.",
                "error"
            );
            return;
        }

        const company = editingCompanyId
            ? companies.find(function (item) {
                return String(item.id) === String(editingCompanyId);
            })
            : null;

        setInputValue("companyName", company ? company.name : "");
        setInputValue("companyCode", company ? company.code : "");
        setInputValue("companyType", company ? company.type : "");
        setInputValue("companyIndustry", company ? company.industry : "");
        setInputValue("companyOwner", company ? company.owner : "");
        setInputValue("companyEmail", company ? company.email : "");
        setInputValue("companyPhone", company ? company.phone : "");
        setInputValue("companyWebsite", company ? company.website : "");
        setInputValue("companyCountry", company ? company.country : "");
        setInputValue("companyCurrency", company ? company.currency : "PKR");
        setInputValue("companyTaxId", company ? company.taxId : "");
        setInputValue("companyFiscalYear", company ? company.fiscalYear : "");
        setInputValue("companyStatus", company ? company.status : "Active");
        setInputValue("companyAddress", company ? company.address : "");
        setInputValue(
            "companyDescription",
            company ? company.description : ""
        );

        const setActiveCheckbox = getElement("companySetActive");

        if (setActiveCheckbox) {
            setActiveCheckbox.checked = company
                ? String(getActiveCompanyId()) === String(company.id)
                : companies.length === 0;
        }

        const modalTitle = modal.querySelector(
            ".modal-title, .modal-header h2, .modal-header h3, h2, h3"
        );

        if (modalTitle) {
            modalTitle.textContent = company
                ? "Edit Company"
                : "Create Company";
        }

        const saveButton = modal.querySelector(
            '[onclick*="saveCompany"], #saveCompanyButton, .save-company-btn'
        );

        if (saveButton) {
            saveButton.textContent = company
                ? "Save Changes"
                : "Create Company";
        }

        modal.style.display = "flex";
        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");
    }

    function closeCompanyModal() {
        const modal = getElement("companyModal");

        if (!modal) {
            return;
        }

        modal.style.display = "none";
        modal.classList.remove("active");
        modal.setAttribute("aria-hidden", "true");

        editingCompanyId = null;
    }

    function saveCompany(event) {
        if (event && typeof event.preventDefault === "function") {
            event.preventDefault();
        }

        const name = getValue("companyName");

        if (!name) {
            showNotice("Please enter the company name.", "warning");

            const nameInput = getElement("companyName");

            if (nameInput) {
                nameInput.focus();
            }

            return false;
        }

        const existingCompany = editingCompanyId
            ? companies.find(function (item) {
                return String(item.id) === String(editingCompanyId);
            })
            : null;

        const company = normalizeCompany({
            id: existingCompany
                ? existingCompany.id
                : generateCompanyId(),

            name: name,
            code: getValue("companyCode"),
            type: getValue("companyType"),
            industry: getValue("companyIndustry"),
            owner: getValue("companyOwner"),
            email: getValue("companyEmail"),
            phone: getValue("companyPhone"),
            website: getValue("companyWebsite"),
            country: getValue("companyCountry"),
            currency: getValue("companyCurrency") || "PKR",
            taxId: getValue("companyTaxId"),
            fiscalYear: getValue("companyFiscalYear"),
            status: normalizeStatus(getValue("companyStatus")),
            address: getValue("companyAddress"),
            description: getValue("companyDescription"),

            // Preserve existing values not currently represented
            // by the company form.
            employees: existingCompany ? existingCompany.employees : 0,
            revenue: existingCompany ? existingCompany.revenue : 0,

            createdAt: existingCompany
                ? existingCompany.createdAt
                : new Date().toISOString(),

            updatedAt: new Date().toISOString()
        });

        const activeCheckbox = getElement("companySetActive");
        const shouldActivate = activeCheckbox
            ? activeCheckbox.checked
            : false;

        if (existingCompany) {
            const index = companies.findIndex(function (item) {
                return String(item.id) === String(existingCompany.id);
            });

            if (index !== -1) {
                companies[index] = company;
            }
        } else {
            companies.push(company);
        }

        if (!saveCompanyStorage()) {
            return false;
        }

        if (
            shouldActivate ||
            companies.length === 1 ||
            String(getActiveCompanyId()) === String(company.id)
        ) {
            setActiveCompany(company.id);
        } else {
            updateActiveCompanyWorkspace();
        }

        closeCompanyModal();
        loadCompanies();

        showNotice(
            existingCompany
                ? "Company updated successfully."
                : "Company created successfully.",
            "success"
        );

        return false;
    }


    /* =====================================================
       LOAD AND RENDER COMPANIES
    ===================================================== */

    function loadCompanies() {
        companies = getStoredCompanies();

        renderCompanyList();
        updateCompanyStats();
        updateActiveCompanyWorkspace();

        return companies;
    }

    

function renderCompanyList() {
    const list = getElement("companyList");

    if (!list) return;

    const searchInput = getElement("companySearch");
    const statusFilter = getElement("companyStatusFilter");

    const searchTerm = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";

    const selectedStatus = statusFilter
        ? statusFilter.value
        : "all";

    const filteredCompanies = companies.filter(function (company) {
        const searchableText = [
            company.name,
            company.code,
            company.type,
            company.industry,
            company.owner,
            company.email,
            company.country
        ].join(" ").toLowerCase();

        const matchesSearch =
            !searchTerm || searchableText.includes(searchTerm);

        const companyStatus = String(company.status || "").toLowerCase();

        const matchesStatus =
            !selectedStatus ||
            selectedStatus.toLowerCase() === "all" ||
            companyStatus === selectedStatus.toLowerCase();

        return matchesSearch && matchesStatus;
    });

    setText("companyListCount", filteredCompanies.length);

    if (filteredCompanies.length === 0) {
        const message = companies.length === 0
            ? "No companies yet. Create your first company to get started."
            : "No matching companies found. Try another search or status.";

        list.innerHTML = `
            <tr>
                <td colspan="7"
                    style="padding:24px 12px; text-align:center; color:#94a3b8;">
                    <div style="font-size:14px; font-weight:600; margin-bottom:6px;">
                        ${escapeHTML(message)}
                    </div>
                    ${
                        companies.length === 0
                            ? `<button type="button"
                                onclick="openCompanyModal()"
                                style="margin-top:10px;">
                                + Create Your First Company
                               </button>`
                            : ""
                    }
                </td>
            </tr>
        `;
        return;
    }

    list.innerHTML = filteredCompanies.map(function (company) {
        const companyId = escapeHTML(company.id);
        const isActive =
            String(company.status || "").toLowerCase() === "active";

        const isActiveWorkspace =
            String(getActiveCompanyId()) === String(company.id);

        const revenue = formatCurrency(
            Number(company.revenue) || 0,
            company.currency || "USD"
        );

        return `
            <tr>
                <td>
                    <strong>${escapeHTML(company.name || "Unnamed Company")}</strong>
                    <small style="display:block; margin-top:4px; color:#8fa8c5; font-size:11px;">
                        ${escapeHTML(company.code || "Business Workspace")}
                    </small>
                </td>

                <td>${escapeHTML(company.industry || company.type || "—")}</td>

                <td>${escapeHTML(company.owner || "—")}</td>

                <td>${(Number(company.employees) || 0).toLocaleString()}</td>

                <td>${escapeHTML(revenue)}</td>

                <td>
                    <span class="company-status-badge ${
                        isActive ? "is-active" : "is-inactive"
                    }">
                        <span class="company-status-dot"></span>
                        ${isActive ? "Active" : "Inactive"}
                    </span>
                </td>

                <td>
                    <div style="display:flex; flex-wrap:wrap; gap:6px;">
                        <button type="button"
                            onclick="viewCompany('${companyId}')">
                            View
                        </button>

                        <button type="button"
                            onclick="editCompany('${companyId}')">
                            Edit
                        </button>

                        <button type="button"
                            onclick="openCompanyWorkspace('${companyId}')"
                            ${!isActive ? "disabled" : ""}>
                            ${isActiveWorkspace ? "✓ Active" : "Open Workspace"}
                        </button>

                        <button type="button"
                            class="company-card-danger"
                            onclick="deleteCompany('${companyId}')">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}




    /* =====================================================
       EDIT COMPANY
    ===================================================== */

    function editCompany(companyId) {
        const company = companies.find(function (item) {
            return String(item.id) === String(companyId);
        });

        if (!company) {
            showNotice("Company not found.", "error");
            return;
        }

        openCompanyModal(company.id);
    }


    /* =====================================================
       VIEW COMPANY
    ===================================================== */

    function viewCompany(companyId) {
        const company = companies.find(function (item) {
            return String(item.id) === String(companyId);
        });

        if (!company) {
            showNotice("Company not found.", "error");
            return;
        }

        const modal = getElement("companyViewModal");

        if (!modal) {
            // A profile modal may not be present in some layouts.
            const details = [
                "Company: " + company.name,
                "Code: " + (company.code || "—"),
                "Type: " + (company.type || "—"),
                "Industry: " + (company.industry || "—"),
                "Owner: " + (company.owner || "—"),
                "Email: " + (company.email || "—"),
                "Phone: " + (company.phone || "—"),
                "Website: " + (company.website || "—"),
                "Country: " + (company.country || "—"),
                "Status: " + company.status
            ];

            window.alert(details.join("\n"));
            return;
        }

        const fields = {
            viewCompanyName: company.name,
            viewCompanyCode: company.code,
            viewCompanyType: company.type,
            viewCompanyIndustry: company.industry,
            viewCompanyOwner: company.owner,
            viewCompanyEmail: company.email,
            viewCompanyPhone: company.phone,
            viewCompanyWebsite: company.website,
            viewCompanyCountry: company.country,
            viewCompanyCurrency: company.currency,
            viewCompanyTaxId: company.taxId,
            viewCompanyFiscalYear: company.fiscalYear,
            viewCompanyStatus: company.status,
            viewCompanyAddress: company.address,
            viewCompanyDescription: company.description
        };

        Object.keys(fields).forEach(function (id) {
            setText(id, fields[id] || "—");
        });

        const modalTitle = modal.querySelector(
            ".modal-title, .modal-header h2, .modal-header h3, h2, h3"
        );

        if (modalTitle) {
            modalTitle.textContent = "Company Profile";
        }

        modal.style.display = "flex";
        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");
    }

    function closeCompanyViewModal() {
        const modal = getElement("companyViewModal");

        if (!modal) {
            return;
        }

        modal.style.display = "none";
        modal.classList.remove("active");
        modal.setAttribute("aria-hidden", "true");
    }


    /* =====================================================
       SELECT AND OPEN WORKSPACE
    ===================================================== */

    function selectCompanyWorkspace(companyId) {
        const company = companies.find(function (item) {
            return String(item.id) === String(companyId);
        });

        if (!company) {
            showNotice("Company not found.", "error");
            return false;
        }

        if (company.status === "Inactive") {
            showNotice(
                "This company is inactive. Activate it before selecting its workspace.",
                "warning"
            );

            return false;
        }

        if (!setActiveCompany(company.id)) {
            return false;
        }

        renderCompanyList();

        showNotice(
            company.name + " is now the active workspace.",
            "success"
        );

        return true;
    }

    function openCompanyWorkspace(companyId) {
        if (companyId !== undefined && companyId !== null) {
            const selected = selectCompanyWorkspace(companyId);

            if (!selected) {
                return;
            }
        }

        const company = getActiveCompany();

        if (!company) {
            showNotice(
                "Please create or select an active company first.",
                "warning"
            );
            return;
        }

        if (company.status === "Inactive") {
            showNotice(
                "This company is inactive. Activate it first.",
                "warning"
            );
            return;
        }

        /*
         * Integrate with the existing Business OS navigation.
         * Different project versions may expose different navigation
         * functions, so check before calling them.
         */

        if (typeof window.showBusinessOSModule === "function") {
            window.showBusinessOSModule("overview");
        } else if (typeof window.openBusinessOSModule === "function") {
            window.openBusinessOSModule("overview");
        } else {
            const dashboardButton = document.querySelector(
                '[data-module="overview"], [data-page="overview"]'
            );

            if (dashboardButton) {
                dashboardButton.click();
            }
        }

        showNotice(
            "Active workspace: " + company.name,
            "success"
        );
    }

    function openActiveCompanyWorkspace() {
        openCompanyWorkspace();
    }


    /* =====================================================
       ACTIVE WORKSPACE DISPLAY
    ===================================================== */

    function updateActiveCompanyWorkspace() {
        const company = getActiveCompany();

        if (!company) {
            setText("activeCompanyName", "No Company Selected");
            setText("activeCompanyType", "Select a company to continue");
            setText("activeCompanyStatus", "⚪ No Workspace");

            setText("activeWorkspaceName", "No Company Selected");
            setText("activeWorkspaceMeta", "Select a company to continue");
            setText("activeWorkspaceStatus", "⚪ No Workspace");

            setText("headerActiveCompanyName", "No Company");

            return;
        }

        const statusText = company.status === "Inactive"
            ? "🔴 Inactive"
            : "🟢 Active";

        setText("activeCompanyName", company.name);
        setText("activeCompanyType", company.type || company.industry || "Company");
        setText("activeCompanyStatus", statusText);

        setText("activeWorkspaceName", company.name);

        setText(
            "activeWorkspaceMeta",
            [company.type, company.industry, company.country]
                .filter(Boolean)
                .join(" • ") || "Business Workspace"
        );

        setText("activeWorkspaceStatus", statusText);
        setText("headerActiveCompanyName", company.name);

        // Update any additional workspace name labels in the interface.
        document.querySelectorAll("[data-active-company-name]").forEach(
            function (element) {
                element.textContent = company.name;
            }
        );
    }


    /* =====================================================
       DELETE COMPANY
    ===================================================== */

    function deleteCompany(companyId) {
        const company = companies.find(function (item) {
            return String(item.id) === String(companyId);
        });

        if (!company) {
            showNotice("Company not found.", "error");
            return false;
        }

        const confirmed = window.confirm(
            'Are you sure you want to delete "' +
            company.name +
            '"?\n\nThis action cannot be undone.'
        );

        if (!confirmed) {
            return false;
        }

        const wasActive =
            String(getActiveCompanyId()) === String(company.id);

        companies = companies.filter(function (item) {
            return String(item.id) !== String(company.id);
        });

        if (!saveCompanyStorage()) {
            // Reload the last persisted state if saving fails.
            companies = getStoredCompanies();
            renderCompanyList();
            updateCompanyStats();
            updateActiveCompanyWorkspace();

            return false;
        }

        if (wasActive) {
            try {
                localStorage.removeItem(ACTIVE_COMPANY_KEY);
            } catch (error) {
                console.error(error);
            }

            // Do not automatically switch the user's workspace.
            updateActiveCompanyWorkspace();
        }

        loadCompanies();

        showNotice(
            "Company deleted successfully.",
            "success"
        );

        return true;
    }


    /* =====================================================
       COMPANY STATUS
    ===================================================== */

    function toggleCompanyStatus(companyId) {
        const company = companies.find(function (item) {
            return String(item.id) === String(companyId);
        });

        if (!company) {
            showNotice("Company not found.", "error");
            return false;
        }

        company.status = company.status === "Active"
            ? "Inactive"
            : "Active";

        company.updatedAt = new Date().toISOString();

        if (!saveCompanyStorage()) {
            companies = getStoredCompanies();
            return false;
        }

        if (
            company.status === "Inactive" &&
            String(getActiveCompanyId()) === String(company.id)
        ) {
            try {
                localStorage.removeItem(ACTIVE_COMPANY_KEY);
            } catch (error) {
                console.error(error);
            }
        }

        loadCompanies();

        showNotice(
            company.name + " is now " + company.status + ".",
            "success"
        );

        return true;
    }


    /* =====================================================
       COMPANY STATISTICS
    ===================================================== */

    function updateCompanyStats() {
        setText("totalCompanies", companies.length);

        const activeCount = companies.filter(function (company) {
            return company.status === "Active";
        }).length;

        setText("activeCompanies", activeCount);

        const employeeCount = companies.reduce(function (total, company) {
            return total + (Number(company.employees) || 0);
        }, 0);

        setText("companyEmployees", employeeCount);

        const totalRevenue = companies.reduce(function (total, company) {
            return total + (Number(company.revenue) || 0);
        }, 0);

        // Keep the existing revenue card and show a sensible total.
        const revenueElement = getElement("companyRevenue");

        if (revenueElement) {
            revenueElement.textContent = formatCurrency(totalRevenue, "PKR");
        }
    }


    /* =====================================================
       SEARCH AND FILTER
    ===================================================== */

    function initializeSearchAndFilters() {
        const searchInput = getElement("companySearch");
        const statusFilter = getElement("companyStatusFilter");

        if (
            searchInput &&
            searchInput.dataset.companyManagementBound !== "true"
        ) {
            searchInput.dataset.companyManagementBound = "true";

            searchInput.addEventListener("input", function () {
                renderCompanyList();
            });
        }

        if (
            statusFilter &&
            statusFilter.dataset.companyManagementBound !== "true"
        ) {
            statusFilter.dataset.companyManagementBound = "true";

            statusFilter.addEventListener("change", function () {
                renderCompanyList();
            });
        }
    }


    /* =====================================================
       MODAL EVENTS
    ===================================================== */

    function initializeModalEvents() {
        const companyModal = getElement("companyModal");
        const viewModal = getElement("companyViewModal");

        if (
            companyModal &&
            companyModal.dataset.companyManagementBound !== "true"
        ) {
            companyModal.dataset.companyManagementBound = "true";

            companyModal.addEventListener("click", function (event) {
                if (event.target === companyModal) {
                    closeCompanyModal();
                }
            });
        }

        if (
            viewModal &&
            viewModal.dataset.companyManagementBound !== "true"
        ) {
            viewModal.dataset.companyManagementBound = "true";

            viewModal.addEventListener("click", function (event) {
                if (event.target === viewModal) {
                    closeCompanyViewModal();
                }
            });
        }
    }


    /* =====================================================
       INITIALIZATION
    ===================================================== */

    function initializeCompanyManagement() {
        const companyList = getElement("companyList");

        /*
         * The component may be loaded dynamically.
         * Retry a limited number of times, then stop.
         * This prevents an endless initialization loop.
         */

        if (!companyList) {
            initializationAttempts++;

            if (initializationAttempts < MAX_INITIALIZATION_ATTEMPTS) {
                setTimeout(
                    initializeCompanyManagement,
                    INITIALIZATION_INTERVAL
                );
            } else {
                console.warn(
                    "Synvora AI: Company Management could not initialize. " +
                    "The #companyList element was not found. " +
                    "Check that components/business-os/company-management.html " +
                    "is loaded before this module initializes."
                );
            }

            return;
        }

        if (initializationStarted) {
            // The HTML component may be loaded again dynamically.
            companies = getStoredCompanies();

            initializeSearchAndFilters();
            initializeModalEvents();

            renderCompanyList();
            updateCompanyStats();
            updateActiveCompanyWorkspace();

            return;
        }

        initializationStarted = true;

        companies = getStoredCompanies();

        initializeSearchAndFilters();
        initializeModalEvents();

        renderCompanyList();
        updateCompanyStats();
        updateActiveCompanyWorkspace();

        console.info(
            "Synvora AI: Company Management initialized successfully."
        );
    }


    /* =====================================================
       EXPOSE PUBLIC FUNCTIONS
       Required by existing HTML onclick handlers.
    ===================================================== */

    window.getStoredCompanies = getStoredCompanies;
    window.saveCompanyStorage = saveCompanyStorage;

    window.getActiveCompany = getActiveCompany;
    window.setActiveCompany = setActiveCompany;

    window.openCompanyModal = openCompanyModal;
    window.closeCompanyModal = closeCompanyModal;
    window.saveCompany = saveCompany;

    window.loadCompanies = loadCompanies;
    window.renderCompanyList = renderCompanyList;

    window.editCompany = editCompany;
    window.viewCompany = viewCompany;
    window.closeCompanyViewModal = closeCompanyViewModal;

    window.selectCompanyWorkspace = selectCompanyWorkspace;
    window.openCompanyWorkspace = openCompanyWorkspace;
    window.openActiveCompanyWorkspace = openActiveCompanyWorkspace;

    window.updateActiveCompanyWorkspace = updateActiveCompanyWorkspace;

    window.deleteCompany = deleteCompany;
    window.toggleCompanyStatus = toggleCompanyStatus;

    window.updateCompanyStats = updateCompanyStats;

    // Compatibility aliases for buttons that use these names.
    window.wsRefreshWorkspace = loadCompanies;

    window.wsSetCompanyActive = function (companyId) {
        return selectCompanyWorkspace(companyId);
    };

    window.wsToggleCompanyStatus = toggleCompanyStatus;

    // Allow the application to initialize the module after
    // dynamically loading the Company Management HTML.
    window.initCompanyManagement = initializeCompanyManagement;


    /* =====================================================
       STARTUP
    ===================================================== */

    function startCompanyManagement() {
        if (document.readyState === "loading") {
            document.addEventListener(
                "DOMContentLoaded",
                initializeCompanyManagement,
                { once: true }
            );
        } else {
            initializeCompanyManagement();
        }
    }

    startCompanyManagement();

})();

/* =========================================================
   SYNVORA AI — BUSINESS CORE MODULE NAVIGATION
   Connects workspace buttons to Business OS navigation.
========================================================= */

(function () {
    "use strict";

    const MODULES = {
        finance: "finance",
        crm: "crm",
        inventory: "inventory",
        employees: "employees",
        invoices: "invoices",
        transactions: "transactions",
        reports: "reports",
        settings: "settings"
    };

    function getSelectedCompany() {
        try {
            const storedCompanies = JSON.parse(
                localStorage.getItem("synvoraCompanies") || "[]"
            );

            let activeId = localStorage.getItem("synvoraActiveCompany");

            try {
                const parsed = JSON.parse(activeId);

                if (parsed && typeof parsed === "object") {
                    activeId = parsed.id;
                } else if (typeof parsed === "string") {
                    activeId = parsed;
                }
            } catch (error) {
                // Support a plain-text company ID.
            }

            return storedCompanies.find(function (company) {
                return String(company.id) === String(activeId);
            }) || null;

        } catch (error) {
            console.error(
                "Synvora AI: Unable to read the active company.",
                error
            );

            return null;
        }
    }

    function showModuleMessage(message) {
        let notice = document.getElementById(
            "businessCoreNavigationNotice"
        );

        if (!notice) {
            notice = document.createElement("div");
            notice.id = "businessCoreNavigationNotice";

            Object.assign(notice.style, {
                position: "fixed",
                right: "24px",
                bottom: "24px",
                zIndex: "999999",
                padding: "14px 20px",
                borderRadius: "12px",
                background: "#172033",
                color: "#ffffff",
                border: "1px solid rgba(255,255,255,.15)",
                boxShadow: "0 10px 30px rgba(0,0,0,.3)",
                fontSize: "14px",
                maxWidth: "360px"
            });

            document.body.appendChild(notice);
        }

        notice.textContent = message;
        notice.style.display = "block";

        clearTimeout(notice._timer);

        notice._timer = setTimeout(function () {
            notice.style.display = "none";
        }, 3500);
    }

function navigateToBusinessModule(moduleName) {
    const company = getSelectedCompany();

    if (!company) {
        showModuleMessage(
            "Please select a company before opening a business module."
        );
        return;
    }

    if (String(company.status || "Active").toLowerCase() === "inactive") {
        showModuleMessage(
            "This company is inactive. Activate it before continuing."
        );
        return;
    }

    const module = MODULES[moduleName];

    if (!module) {
        showModuleMessage("Unknown business module: " + moduleName);
        return;
    }

    if (typeof window.setActiveCompany === "function") {
        if (window.setActiveCompany(company.id) === false) {
            showModuleMessage("Could not activate the selected company.");
            return;
        }
    }

    /*
     * Finance ke andar maujood individual containers ki mapping.
     * Transactions ka apna data-business-module section nahi hai.
     */
    const containerMap = {
        finance: "finance-dashboard-container",
        transactions: "transactions-container",
        invoices: "invoice-management-container",
        crm: "crm-dashboard-container",
        inventory: "inventory-dashboard-container",
        employees: "employee-dashboard-container",
        reports: "reports-dashboard-container",
        settings: "settings-container"
    };

    const targetContainerId = containerMap[moduleName];

    /*
     * Pehle requested module ka actual container check karo.
     */
    if (targetContainerId) {
        const container = document.getElementById(targetContainerId);

        if (container) {
            const parentSection = container.closest(
                "[data-business-module]"
            );

            if (parentSection) {
                const parentModule = parentSection.getAttribute(
                    "data-business-module"
                );

                /*
                 * Transactions aur invoices Finance section ke andar hain.
                 */
                if (
                    moduleName === "transactions" ||
                    moduleName === "invoices"
                ) {
                    if (typeof window.showBusinessOSModule === "function") {
                        window.showBusinessOSModule("finance");
                    } else {
                        document.querySelectorAll(
                            "[data-business-module]"
                        ).forEach(function (section) {
                            const isFinance =
                                section.getAttribute("data-business-module")
                                === "finance";

                            section.hidden = !isFinance;

                            if (isFinance) {
                                section.style.removeProperty("display");
                            } else {
                                section.style.setProperty(
                                    "display",
                                    "none",
                                    "important"
                                );
                            }
                        });
                    }
                } else if (
                    typeof window.showBusinessOSModule === "function"
                ) {
                    window.showBusinessOSModule(parentModule);
                } else {
                    document.querySelectorAll(
                        "[data-business-module]"
                    ).forEach(function (section) {
                        const isSelected =
                            section.getAttribute("data-business-module")
                            === parentModule;

                        section.hidden = !isSelected;

                        if (isSelected) {
                            section.style.removeProperty("display");
                        } else {
                            section.style.setProperty(
                                "display",
                                "none",
                                "important"
                            );
                        }
                    });
                }

                container.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

                return;
            }

            container.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

            return;
        }
    }

    /*
     * Agar individual container nahi mila, to normal module router try karo.
     */
    if (typeof window.showBusinessOSModule === "function") {
        window.showBusinessOSModule(module);
        return;
    }

    const targetSection = Array.from(
        document.querySelectorAll("[data-business-module]")
    ).find(function (section) {
        return section.getAttribute("data-business-module") === module;
    });

    if (targetSection) {
        document.querySelectorAll(
            "[data-business-module]"
        ).forEach(function (section) {
            const isSelected = section === targetSection;

            section.hidden = !isSelected;

            if (isSelected) {
                section.style.removeProperty("display");
            } else {
                section.style.setProperty(
                    "display",
                    "none",
                    "important"
                );
            }
        });

        targetSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        return;
    }

    showModuleMessage(
        "Module container nahi mila: " + targetContainerId
    );
}

    /*
     * Delegated click handling also works when the workspace
     * HTML is inserted dynamically.
     */
    document.addEventListener("click", function (event) {
        const button = event.target.closest(
            "[data-company-workspace-module]"
        );

        if (!button) {
            return;
        }

        event.preventDefault();

        const moduleName = button.getAttribute(
            "data-company-workspace-module"
        );

        navigateToBusinessModule(moduleName);
    });

    /*
     * Public function for testing or other application buttons.
     */
    window.openCompanyBusinessModule = navigateToBusinessModule;

})();