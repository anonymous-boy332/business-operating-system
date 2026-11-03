/* ==========================================
   SYNVORA AI
   COMPANY WORKSPACE BUTTONS
   ========================================== */

console.log("Company Workspace Buttons JS Loaded");


/* ==========================================
   COMPANY WORKSPACE MODULE NAVIGATION
   ========================================== */

function openCompanyWorkspaceModule(moduleName) {

    const moduleMap = {

        finance:
            "finance-dashboard-container",

        crm:
            "crm-dashboard-container",

        inventory:
            "inventory-dashboard-container",

        employees:
            "employee-dashboard-container",

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
        moduleMap[moduleName];


    if (!targetId) {

        console.error(
            "Unknown Company Workspace module:",
            moduleName
        );

        return;
    }


    const target =
        document.getElementById(targetId);


    if (!target) {

        console.error(
            "Company Workspace target not found:",
            targetId
        );

        return;
    }


    /*
        Close Company Workspace
        before opening another module.
    */

    const workspace =
        document.querySelector(
            ".company-workspace"
        );


    if (workspace) {

        workspace.style.display =
            "none";

    }


    /*
        Show target module
    */

    target.style.display =
        "block";


    /*
        Smooth scroll to module
    */

    target.scrollIntoView({

        behavior: "smooth",

        block: "start"

    });


    console.log(
        "Company Workspace module opened:",
        moduleName
    );

}


/* ==========================================
   BACK TO COMPANIES
   ========================================== */

function closeCompanyWorkspace() {

    const workspace =
        document.querySelector(
            ".company-workspace"
        );


    const companyManagement =
        document.getElementById(
            "company-management-container"
        );


    if (workspace) {

        workspace.style.display =
            "none";

    }


    if (companyManagement) {

        companyManagement.style.display =
            "block";


        companyManagement.scrollIntoView({

            behavior: "smooth",

            block: "start"

        });

    }


    console.log(
        "Returned to Company Management"
    );

}


/* ==========================================
   COMPANY WORKSPACE BUTTON LISTENER
   ========================================== */

document.addEventListener(
    "click",
    function(event) {

        const button =
            event.target.closest(
                "[data-company-workspace-module]"
            );


        if (!button) {

            return;

        }


        const module =
            button.dataset.companyWorkspaceModule;


        if (!module) {

            return;

        }


        openCompanyWorkspaceModule(
            module
        );

    }
);


/* ==========================================
   INITIALIZE COMPANY WORKSPACE BUTTONS
   ========================================== */

function initializeCompanyWorkspaceButtons() {

    console.log(
        "Company Workspace buttons initialized."
    );

}


if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeCompanyWorkspaceButtons
    );

} else {

    initializeCompanyWorkspaceButtons();

}

/* ==========================================
   BACK BUTTON LISTENER
   ========================================== */

document.addEventListener(
    "click",
    function(event) {

        const button =
            event.target.closest(
                "[data-company-workspace-back]"
            );


        if (!button) {

            return;

        }


        closeCompanyWorkspace();

    }
);