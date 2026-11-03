/* ==========================================
   SYNVORA AI - COMPANY WORKSPACE
========================================== */

console.log("Company Workspace JS Loaded");


/* ==========================================
   OPEN COMPANY WORKSPACE
========================================== */

/* ==========================================
   OPEN COMPANY WORKSPACE
========================================== */

function openCompanyWorkspace(id) {
    const companies = JSON.parse(localStorage.getItem("synvoraCompanies") || "[]");
    const company = Array.isArray(companies)
        ? companies.find(item => String(item.id) === String(id))
        : null;
    if (!company) {
        console.error("[Company workspace] The requested company does not exist.");
        return;
    }

    if (typeof window.selectCompanyWorkspace === "function") {
        if (!window.selectCompanyWorkspace(company.id)) return;
    } else {
        localStorage.setItem("synvoraActiveCompany", String(company.id));
        localStorage.setItem("synvoraActiveCompanyId", String(company.id));
        window.SynvoraCompanyScope?.notifyCompanyChange();
    }

    window.showBusinessOSModule?.("overview");
}


/* ==========================================
   LOAD COMPANY WORKSPACE
========================================== */

async function loadCompanyWorkspace() {

    const container =
        document.getElementById(
            "active-workspace-container"
        );


    if (!container) return;


    try {

        const response =
            await fetch(
                "components/business-os/company-workspace.html"
            );


        if (!response.ok) {

            throw new Error(
                "Company Workspace file not found."
            );

        }


        const html =
            await response.text();


        container.innerHTML = html;


        /*
            Make sure the workspace is visible
            when it is loaded.
        */

        container.style.display = "block";


        /* Populate selected company data */

        populateCompanyWorkspace();


        console.log(
            "Company Workspace Loaded Successfully"
        );


    }
    catch (error) {

        console.error(
            "Company Workspace Error:",
            error
        );


        container.innerHTML = `

            <div class="workspace-load-error">

                ❌ Unable to load Company Workspace.

                <small>
                    ${error.message}
                </small>

            </div>

        `;

    }

}


/* ==========================================
   POPULATE COMPANY DATA
========================================== */

/* ==========================================
   POPULATE COMPANY WORKSPACE
   COMPANY-SPECIFIC DATA
========================================== */

function populateCompanyWorkspace() {

    /* ==========================================
       GET ACTIVE COMPANY
    ========================================== */

    const company =
        typeof getActiveCompany === "function"
            ? getActiveCompany()
            : null;

    if (!company) {

        console.warn(
            "No active company found."
        );

        return;
    }


    /* ==========================================
       GET COMPANY-SPECIFIC STATISTICS
    ========================================== */

    const statistics =
        typeof getCompanyStatistics === "function"
            ? getCompanyStatistics(company.id)
            : {
                revenue: 0,
                employees: 0,
                orders: 0,
                customers: 0,
                expenses: 0,
                invoices: 0
            };


    /* ==========================================
       COMPANY NAME
    ========================================== */

    const name =
        document.getElementById(
            "workspaceCompanyName"
        );

    if (name) {

        name.textContent =
            company.name || "Unnamed Company";

    }


    /* ==========================================
       COMPANY META
    ========================================== */

    const meta =
        document.getElementById(
            "workspaceCompanyMeta"
        );

    if (meta) {

        meta.textContent =

            (company.type || "Business") +
            " • " +
            (company.owner || "Owner") +
            " • " +
            (company.currency || "USD");

    }


    /* ==========================================
       COMPANY STATUS
    ========================================== */

    const status =
        document.getElementById(
            "workspaceCompanyStatus"
        );

    if (status) {

        status.textContent =
            company.status === "Active"
                ? "🟢 Active"
                : "🔴 Inactive";

        status.className =
            company.status === "Active"
                ? "workspace-company-status active"
                : "workspace-company-status inactive";

    }


    /* ==========================================
       REVENUE
    ========================================== */

    const revenue =
        document.getElementById(
            "workspaceRevenue"
        );

    if (revenue) {

        revenue.textContent =
            formatWorkspaceCurrency(
                statistics.revenue || 0,
                company.currency || "USD"
            );

    }


    /* ==========================================
       EMPLOYEES
    ========================================== */

    const employees =
        document.getElementById(
            "workspaceEmployees"
        );

    if (employees) {

        employees.textContent =
            statistics.employees || 0;

    }


    /* ==========================================
       ORDERS
    ========================================== */

    const orders =
        document.getElementById(
            "workspaceOrders"
        );

    if (orders) {

        orders.textContent =
            statistics.orders || 0;

    }


    /* ==========================================
       BUSINESS GROWTH
       Temporary company-specific calculation
    ========================================== */

    const growth =
        document.getElementById(
            "workspaceGrowth"
        );

    if (growth) {

        const companyGrowth =
            Number(company.growth || 0);

        growth.textContent =
            companyGrowth >= 0
                ? `+${companyGrowth}%`
                : `${companyGrowth}%`;

    }


    /* ==========================================
       BUSINESS HEALTH
    ========================================== */

    const health =
        document.getElementById(
            "workspaceHealth"
        );

    const healthBar =
        document.getElementById(
            "workspaceHealthBar"
        );

    /*
        For now health comes from company profile.
        Later we can calculate it automatically
        from Finance + CRM + Inventory + Sales.
    */

    const healthValue =
        Number(company.health || 0);

    if (health) {

        health.textContent =
            `${healthValue}%`;

    }

    if (healthBar) {

        healthBar.style.width =
            `${healthValue}%`;

    }


    /* ==========================================
       COMPANY OWNER
    ========================================== */

    const owner =
        document.getElementById(
            "workspaceOwner"
        );

    if (owner) {

        owner.textContent =
            company.owner || "-";

    }


    /* ==========================================
       COMPANY EMAIL
    ========================================== */

    const email =
        document.getElementById(
            "workspaceEmail"
        );

    if (email) {

        email.textContent =
            company.email || "-";

    }


    /* ==========================================
       COMPANY PHONE
    ========================================== */

    const phone =
        document.getElementById(
            "workspacePhone"
        );

    if (phone) {

        phone.textContent =
            company.phone || "-";

    }


    /* ==========================================
       COMPANY COUNTRY
    ========================================== */

    const country =
        document.getElementById(
            "workspaceCountry"
        );

    if (country) {

        country.textContent =
            company.country || "-";

    }


    /* ==========================================
       COMPANY ADDRESS
    ========================================== */

    const address =
        document.getElementById(
            "workspaceAddress"
        );

    if (address) {

        address.textContent =
            company.address || "-";

    }


    /* ==========================================
       DEBUG
    ========================================== */

    console.log(
        "Company Workspace Data Loaded:",
        company.name,
        company.id,
        statistics
    );

}


/* ==========================================
   CLOSE COMPANY WORKSPACE
   BACK TO COMPANIES
========================================== */

function closeCompanyWorkspace() {

    const workspaceContainer =
        document.getElementById(
            "active-workspace-container"
        );


    const companyManagement =
        document.getElementById(
            "company-management-container"
        );


    /* Hide workspace */

    if (workspaceContainer) {

        workspaceContainer.innerHTML = "";

        workspaceContainer.style.display = "none";

    }


    /* Show Company Management */

    if (companyManagement) {

        companyManagement.style.display = "block";

    }


    /*
        Automatic scrolling removed.

        Company Management will remain
        at its current page position.
    */


    console.log(
        "Returned to Company Management"
    );

}


/* ==========================================
   OPEN WORKSPACE MODULE
========================================== */

function openWorkspaceModule(module) {

    const moduleTargets = {

        finance:
            "finance-dashboard-container",

        crm:
            "crm-management-container",

        inventory:
            "inventory-table-container",

        employees:
            "employee-management-container",

        invoices:
            "invoice-management-container",

        transactions:
            "transactions-container",

        reports:
            "reports-dashboard-container",

        settings:
            "settings-container"

    };


    const targetId =
        moduleTargets[module];


    if (!targetId) {

        console.error(
            "Workspace module not found:",
            module
        );

        return;

    }


    const target =
        document.getElementById(targetId);


    if (!target) {

        console.error(
            "Module container not found:",
            targetId
        );

        return;

    }


    /*
        IMPORTANT:

        The module buttons remain active.
        Automatic scroll has been removed.

        Existing module behavior is preserved
        without forcing the page to jump.
    */

        if(module === "transactions"){

    if(
        typeof loadCompanyTransactions === "function"
    ){

        loadCompanyTransactions();

    }

    displayTransactions();

    updateTransactionStats();

    updateFinanceChart();

}

    console.log(
        "Workspace Module Selected:",
        module
    );

}


/* ==========================================
   CURRENCY
========================================== */

function formatWorkspaceCurrency(
    amount,
    currency = "USD"
) {

    try {

        return new Intl.NumberFormat(
            "en-US",
            {
                style: "currency",
                currency: currency,
                maximumFractionDigits: 0
            }
        ).format(amount);

    }
    catch (error) {

        return "$" + amount;

    }

}


/* ==========================================
   RESTORE WORKSPACE AFTER REFRESH
========================================== */

function restoreCompanyWorkspace() {

    const savedCompany =
        localStorage.getItem(
            "synvoraActiveCompany"
        );


    if (!savedCompany) {

        return;

    }


    loadCompanyWorkspace();

}


/* ==========================================
   AUTO RESTORE
========================================== */

setTimeout(
    restoreCompanyWorkspace,
    500
);


/* ==========================================
   LOAD ACTIVE COMPANY INTO SETTINGS
========================================== */

function loadCompanySettings() {

    const savedCompany =
        localStorage.getItem(
            "synvoraActiveCompany"
        );


    if (!savedCompany) {

        return;

    }


    const company =
        JSON.parse(savedCompany);


    const companyName =
        document.getElementById(
            "settingsCompanyName"
        );


    const companyType =
        document.getElementById(
            "settingsCompanyType"
        );


    const companyEmail =
        document.getElementById(
            "settingsCompanyEmail"
        );


    const companyPhone =
        document.getElementById(
            "settingsCompanyPhone"
        );


    const currency =
        document.getElementById(
            "settingsCurrency"
        );


    const country =
        document.getElementById(
            "settingsCountry"
        );


    const status =
        document.getElementById(
            "settingsBusinessStatus"
        );


    if (companyName) {

        companyName.value =
            company.name || "";

    }


    if (companyType) {

        companyType.value =
            company.type || "";

    }


    if (companyEmail) {

        companyEmail.value =
            company.email || "";

    }


    if (companyPhone) {

        companyPhone.value =
            company.phone || "";

    }


    if (currency) {

        currency.value =
            company.currency || "USD";

    }


    if (country) {

        country.value =
            company.country || "";

    }


    if (status) {

        status.value =
            company.status || "Active";

    }

}