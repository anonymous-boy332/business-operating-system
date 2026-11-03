/* =========================================================
   SYNVORA AI
   OWNER TEAM PERMISSIONS PANEL
   File: js/team-permissions.js

   Features:
   - Designation Based Permissions
   - Custom Permissions
   - Employee Access Control
   - Employee-wise Permission Saving
========================================================= */

"use strict";

console.log("Synvora AI - Team Permissions Loaded");


/* =========================================================
   AVAILABLE ROLES
========================================================= */

const teamPermissionRoles = [
    "Owner",
    "Manager",
    "Supervisor",
    "HR",
    "Accountant",
    "Sales",
    "Employee"
];


/* =========================================================
   AVAILABLE DESIGNATIONS
========================================================= */

const teamDesignations = [
    "CEO",
    "General Manager",
    "HR Manager",
    "HR Executive",
    "Finance Manager",
    "Accountant",
    "Sales Manager",
    "Sales Executive",
    "Marketing Manager",
    "Marketing Executive",
    "Inventory Manager",
    "Inventory Executive",
    "Operations Manager",
    "Supervisor",
    "Employee"
];


/* =========================================================
   AVAILABLE PERMISSIONS
========================================================= */

const teamPermissions = [

    "Company Overview",

    "Finance",
    "View Finance",
    "Add Transactions",
    "Manage Expenses",
    "View Invoices",
    "Manage Invoices",
    "Delete Transactions",

    "CRM",
    "View Customers",
    "Manage Customers",

    "Sales",

    "Inventory",
    "Manage Inventory",

    "Employees",
    "Manage Employees",

    "Attendance",
    "Manage Attendance",

    "Assigned Tasks",
    "Manage Tasks",

    "Reports",
    "Export Reports",

    "Company Settings",

    "Personal Profile"

];


/* =========================================================
   DESIGNATION PERMISSION TEMPLATES
========================================================= */

const designationPermissionTemplates = {

    "CEO": teamPermissions.slice(),

    "General Manager": [
        "Company Overview",
        "Finance",
        "View Finance",
        "CRM",
        "View Customers",
        "Sales",
        "Inventory",
        "Employees",
        "Manage Employees",
        "Attendance",
        "Manage Attendance",
        "Assigned Tasks",
        "Manage Tasks",
        "Reports",
        "Export Reports"
    ],

    "HR Manager": [
        "Employees",
        "Manage Employees",
        "Attendance",
        "Manage Attendance",
        "Assigned Tasks",
        "Manage Tasks",
        "Reports",
        "Personal Profile"
    ],

    "HR Executive": [
        "Employees",
        "Attendance",
        "Assigned Tasks",
        "Personal Profile"
    ],

    "Finance Manager": [
        "Finance",
        "View Finance",
        "Add Transactions",
        "Manage Expenses",
        "View Invoices",
        "Manage Invoices",
        "Delete Transactions",
        "Reports",
        "Export Reports",
        "Personal Profile"
    ],

    "Accountant": [
        "Finance",
        "View Finance",
        "Add Transactions",
        "Manage Expenses",
        "View Invoices",
        "Manage Invoices",
        "Reports",
        "Personal Profile"
    ],

    "Sales Manager": [
        "CRM",
        "View Customers",
        "Manage Customers",
        "Sales",
        "Assigned Tasks",
        "Manage Tasks",
        "Reports",
        "Personal Profile"
    ],

    "Sales Executive": [
        "CRM",
        "View Customers",
        "Sales",
        "Assigned Tasks",
        "Personal Profile"
    ],

    "Marketing Manager": [
        "CRM",
        "View Customers",
        "Sales",
        "Reports",
        "Assigned Tasks",
        "Manage Tasks",
        "Personal Profile"
    ],

    "Marketing Executive": [
        "CRM",
        "Assigned Tasks",
        "Personal Profile"
    ],

    "Inventory Manager": [
        "Inventory",
        "Manage Inventory",
        "Reports",
        "Assigned Tasks",
        "Manage Tasks",
        "Personal Profile"
    ],

    "Inventory Executive": [
        "Inventory",
        "Assigned Tasks",
        "Personal Profile"
    ],

    "Operations Manager": [
        "Company Overview",
        "Inventory",
        "Employees",
        "Attendance",
        "Manage Attendance",
        "Assigned Tasks",
        "Manage Tasks",
        "Reports",
        "Personal Profile"
    ],

    "Supervisor": [
        "Employees",
        "Attendance",
        "Assigned Tasks",
        "Manage Tasks",
        "Personal Profile"
    ],

    "Employee": [
        "Assigned Tasks",
        "Attendance",
        "Personal Profile"
    ]

};


/* =========================================================
   HELPER FUNCTIONS
========================================================= */

function getTeamEmployees() {

    try {

        const data = JSON.parse(
            localStorage.getItem("employees") || "[]"
        );

        return Array.isArray(data) ? data : [];

    } catch (error) {

        console.error("Employee data could not be loaded:", error);

        return [];

    }

}


function escapeTeamHTML(value) {

    return String(value ?? "").replace(
        /[&<>"']/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]
    );

}


function getDesignationPermissions(designation) {

    return [
        ...(designationPermissionTemplates[designation] || [])
    ];

}


/* =========================================================
   LOAD TEAM MEMBERS
========================================================= */

function loadTeamPermissions() {

    const container = document.getElementById("teamPermissionsList");

    if (!container) {
        console.warn("Team Permissions list container not loaded yet.");
        return;
    }

    const employees = getTeamEmployees();

    if (!employees.length) {
        container.innerHTML = `
            <div class="permissions-empty">
                <span>👥</span>
                <h3>No Team Members Found</h3>
                <p>Add employees from Employee Management to manage their permissions.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = employees.map(employee => {

        console.log("TEAM EMPLOYEES:", employees);
console.log("PERMISSION OPTIONS:", teamPermissions);

        const employeeId = String(employee.id ?? "");
        const designation = employee.designation || "Employee";
        const role = employee.role || "Employee";
        const accessStatus = employee.accessStatus || "Active";

        // Empty permissions array means use designation defaults.
        const savedPermissions =
            Array.isArray(employee.permissions) && employee.permissions.length
                ? employee.permissions
                : getDesignationPermissions(designation);

        const designationOptions = teamDesignations.map(item => `
            <option value="${escapeTeamHTML(item)}"
                ${item === designation ? "selected" : ""}>
                ${escapeTeamHTML(item)}
            </option>
        `).join("");

        const roleOptions = teamPermissionRoles.map(item => `
            <option value="${escapeTeamHTML(item)}"
                ${item === role ? "selected" : ""}>
                ${escapeTeamHTML(item)}
            </option>
        `).join("");

        const permissionHTML = teamPermissions.map(permission => `
            <label class="permission-checkbox">
                <input
                    type="checkbox"
                    value="${escapeTeamHTML(permission)}"
                    data-permission="${escapeTeamHTML(permission)}"
                    ${savedPermissions.includes(permission) ? "checked" : ""}>
                <span>${escapeTeamHTML(permission)}</span>
            </label>
        `).join("");

        return `
            <div class="team-permission-card"
                 data-employee-id="${escapeTeamHTML(employeeId)}">

                <div class="team-member-info">
                    <div class="team-member-avatar">👤</div>
                    <div>
                        <strong>${escapeTeamHTML(employee.name || "Unnamed Employee")}</strong>
                        <small>${escapeTeamHTML(employee.email || "No email available")}</small>
                        <small>${escapeTeamHTML(employee.department || "No Department")}</small>
                    </div>
                </div>

                <div class="team-member-role">
                    <label>Employee Designation</label>
                    <select class="employee-designation-select">
                        ${designationOptions}
                    </select>
                </div>

                <div class="team-member-role">
                    <label>System Role</label>
                    <select class="employee-role-select">
                        ${roleOptions}
                    </select>
                </div>

                <div class="team-member-role">
                    <label>Account Access</label>
                    <select class="employee-access-select">
                        <option value="Active" ${accessStatus === "Active" ? "selected" : ""}>Active</option>
                        <option value="Suspended" ${accessStatus === "Suspended" ? "selected" : ""}>Suspended</option>
                    </select>
                </div>

                <div class="team-member-permissions">
                    <label>Module Permissions</label>
                    <div class="permissions-grid">
                        ${permissionHTML}
                    </div>
                </div>

                <div class="team-member-actions">
                    <button type="button"
                            class="secondary-btn"
                            data-action="apply-designation">
                        Apply Designation Defaults
                    </button>

                    <button type="button"
                            class="primary-btn"
                            data-action="save-permissions">
                        💾 Save Permissions
                    </button>
                </div>

            </div>
        `;

    }).join("");

}


/* =========================================================
   APPLY DESIGNATION DEFAULT PERMISSIONS
========================================================= */

function applyDesignationDefaults(card) {

    if (!card) return;

    const designationSelect = card.querySelector(
        ".employee-designation-select"
    );

    if (!designationSelect) return;

    const designation = designationSelect.value;

    const defaultPermissions =
        getDesignationPermissions(designation);

    const inputs = card.querySelectorAll(
        ".permission-checkbox input"
    );

    inputs.forEach(input => {

        input.checked = defaultPermissions.includes(
            input.value
        );

    });

    card.dataset.permissionsModified = "true";

}

/* =========================================================
   PREMIUM EMPLOYEE PERMISSION SUCCESS POPUP
========================================================= */

function showTeamPermissionSuccess() {

    const oldPopup = document.getElementById(
        "teamPermissionSuccessPopup"
    );

    if (oldPopup) oldPopup.remove();

    const popup = document.createElement("div");

    popup.id = "teamPermissionSuccessPopup";

    popup.innerHTML = `
        <div class="team-success-modal">

            <div class="team-success-icon">
                <svg viewBox="0 0 24 24" fill="none">
                    <path
                        d="M5 12.5L10 17L19 7"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
            </div>

            <span class="team-success-tag">
                SYNVORA AI • TEAM MANAGEMENT
            </span>

            <h3>Permissions Saved!</h3>

            <p>
                Employee permissions have been
                successfully updated.
            </p>

            <button type="button" class="team-success-close">
                Continue <span>→</span>
            </button>

        </div>
    `;

    document.body.appendChild(popup);

    const closeButton = popup.querySelector(
        ".team-success-close"
    );

    function closePopup() {
        popup.classList.add("team-success-hiding");

        setTimeout(() => {
            popup.remove();
        }, 200);
    }

    closeButton.addEventListener("click", closePopup);

    popup.addEventListener("click", function(event) {
        if (event.target === popup) {
            closePopup();
        }
    });

    function handleEscape(event) {
        if (event.key === "Escape") {
            closePopup();
            document.removeEventListener("keydown", handleEscape);
        }
    }

    document.addEventListener("keydown", handleEscape);
}

/* =========================================================
   SAVE EMPLOYEE PERMISSIONS
========================================================= */

function saveEmployeePermissions(employeeId) {

    const employees = getTeamEmployees();

    const employeeIndex = employees.findIndex(employee =>

        String(employee.id) === String(employeeId)

    );

    if (employeeIndex === -1) {

        alert("Employee not found.");

        return;

    }


    const container = document.getElementById(
        "teamPermissionsList"
    );

    if (!container) return;


    const card = Array.from(
        container.querySelectorAll(".team-permission-card")
    ).find(item =>

        item.dataset.employeeId === String(employeeId)

    );

    if (!card) return;


    const designationSelect = card.querySelector(
        ".employee-designation-select"
    );

    const roleSelect = card.querySelector(
        ".employee-role-select"
    );

    const accessSelect = card.querySelector(
        ".employee-access-select"
    );


    const permissionInputs = card.querySelectorAll(
        ".permission-checkbox input"
    );

    const permissions = [];

    permissionInputs.forEach(input => {

        if (input.checked) {

            permissions.push(input.value);

        }

    });


    employees[employeeIndex].designation =
        designationSelect
            ? designationSelect.value
            : "Employee";


    employees[employeeIndex].role =
        roleSelect
            ? roleSelect.value
            : "Employee";


    employees[employeeIndex].accessStatus =
        accessSelect
            ? accessSelect.value
            : "Active";


    employees[employeeIndex].permissions =
        permissions;


    try {

        localStorage.setItem(
            "employees",
            JSON.stringify(employees)
        );

        showTeamPermissionSuccess();

        console.log(
            "Updated Employee Permissions:",
            employees[employeeIndex]
        );

    } catch (error) {

        console.error("Permission save failed:", error);

        alert("Unable to save employee permissions.");

    }

}


/* =========================================================
   PANEL BUTTON EVENTS
========================================================= */

(function initializeTeamPermissionEvents() {

    if (window.teamPermissionEventsInitialized) return;

    window.teamPermissionEventsInitialized = true;


    document.addEventListener("click", function(event) {

        const button = event.target.closest(
            "#teamPermissionsList [data-action]"
        );

        if (!button) return;

        const card = button.closest(
            ".team-permission-card"
        );

        if (!card) return;

        const employeeId = card.dataset.employeeId;

        if (button.dataset.action === "apply-designation") {

            applyDesignationDefaults(card);

        }

        if (button.dataset.action === "save-permissions") {

            saveEmployeePermissions(employeeId);

        }

    });


    document.addEventListener("change", function(event) {

        const select = event.target.closest(
            "#teamPermissionsList .employee-designation-select"
        );

        if (!select) return;

        const card = select.closest(
            ".team-permission-card"
        );

        applyDesignationDefaults(card);

    });

})();


/* =========================================================
   CLOSE TEAM PERMISSIONS
========================================================= */

function closeTeamPermissions() {

    const settings = document.getElementById(
        "settings-container"
    );

    if (typeof window.showBusinessOSModule === "function") {
        window.showBusinessOSModule("overview");
    }

    if (settings) {

        settings.style.removeProperty("display");

        settings.scrollIntoView({

            behavior: "smooth",
            block: "start"

        });

    }

}


/* =========================================================
   OPEN TEAM PERMISSIONS
========================================================= */

function openTeamPermissions() {

    const container = document.getElementById(
        "team-permissions-container"
    );

    if (!container) {

        console.error(
            "Team Permissions container not found."
        );

        return;

    }

    if (typeof window.showBusinessOSModule === "function") {
        window.showBusinessOSModule("team");
    }

    container.style.removeProperty("display");

    loadTeamPermissions();

    container.scrollIntoView({

        behavior: "smooth",
        block: "start"

    });

}
