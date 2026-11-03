```javascript
/* =========================================================
   SYNVORA AI — SECURITY CONFIGURATION
   Version: 1.0.0

   PURPOSE:
   1. Central security configuration
   2. Company role definitions
   3. Module permission definitions
   4. Frontend permission checks

   IMPORTANT:
   This file is NOT a replacement for backend security.
   Never trust frontend permissions for data protection.
   ========================================================= */

(function () {
    "use strict";

    // Prevent accidental duplicate initialization.
    if (window.SynvoraSecurity) {
        console.warn("Synvora Security is already initialized.");
        return;
    }

    // =====================================================
    // 1. APPLICATION SECURITY SETTINGS
    // =====================================================

    const CONFIG = Object.freeze({
        APP_NAME: "Synvora AI",
        SECURITY_VERSION: "1.0.0",

        // Backend will be connected later.
        BACKEND_CONNECTED: false,

        // Database authorization is not configured here.
        DATABASE_SECURITY_CONFIGURED: false,

        // Never treat frontend checks as database security.
        FRONTEND_CHECKS_ONLY: true
    });


    // =====================================================
    // 2. USER ROLES
    // =====================================================

    const ROLES = Object.freeze({
        COMPANY_OWNER: "company_owner",
        MANAGER: "manager",
        ACCOUNTANT: "accountant",
        SALES: "sales",
        EMPLOYEE: "employee"
    });


    // =====================================================
    // 3. AVAILABLE PERMISSIONS
    // =====================================================

    const PERMISSIONS = Object.freeze({

        // Dashboard
        DASHBOARD_VIEW: "dashboard.view",

        // Finance
        FINANCE_VIEW: "finance.view",
        FINANCE_CREATE: "finance.create",
        FINANCE_EDIT: "finance.edit",
        FINANCE_DELETE: "finance.delete",
        FINANCE_EXPORT: "finance.export",

        // CRM
        CRM_VIEW: "crm.view",
        CRM_CREATE: "crm.create",
        CRM_EDIT: "crm.edit",
        CRM_DELETE: "crm.delete",
        CRM_EXPORT: "crm.export",

        // Inventory
        INVENTORY_VIEW: "inventory.view",
        INVENTORY_CREATE: "inventory.create",
        INVENTORY_EDIT: "inventory.edit",
        INVENTORY_DELETE: "inventory.delete",

        // Employees
        EMPLOYEES_VIEW: "employees.view",
        EMPLOYEES_CREATE: "employees.create",
        EMPLOYEES_EDIT: "employees.edit",
        EMPLOYEES_DELETE: "employees.delete",

        // Attendance
        ATTENDANCE_VIEW: "attendance.view",
        ATTENDANCE_CREATE: "attendance.create",
        ATTENDANCE_EDIT: "attendance.edit",
        ATTENDANCE_DELETE: "attendance.delete",

        // Sales
        SALES_VIEW: "sales.view",
        SALES_CREATE: "sales.create",
        SALES_EDIT: "sales.edit",
        SALES_DELETE: "sales.delete",

        // Invoices
        INVOICES_VIEW: "invoices.view",
        INVOICES_CREATE: "invoices.create",
        INVOICES_EDIT: "invoices.edit",
        INVOICES_DELETE: "invoices.delete",

        // Reports
        REPORTS_VIEW: "reports.view",
        REPORTS_EXPORT: "reports.export",

        // Company settings
        COMPANY_SETTINGS_VIEW: "company_settings.view",
        COMPANY_SETTINGS_EDIT: "company_settings.edit",

        // Team management
        TEAM_VIEW: "team.view",
        TEAM_INVITE: "team.invite",
        TEAM_MANAGE: "team.manage",
        PERMISSIONS_MANAGE: "permissions.manage"
    });


    // =====================================================
    // 4. DEFAULT ROLE PERMISSIONS
    //
    // These are frontend defaults only.
    // Actual permissions must be enforced by the backend.
    // =====================================================

    const ROLE_PERMISSIONS = Object.freeze({

        // Company owner: access within their own company.
        [ROLES.COMPANY_OWNER]: Object.freeze([
            ...Object.values(PERMISSIONS)
        ]),

        // Manager: operational access, no default permission
        // to manage employee permissions or company settings.
        [ROLES.MANAGER]: Object.freeze([
            PERMISSIONS.DASHBOARD_VIEW,

            PERMISSIONS.FINANCE_VIEW,

            PERMISSIONS.CRM_VIEW,
            PERMISSIONS.CRM_CREATE,
            PERMISSIONS.CRM_EDIT,

            PERMISSIONS.INVENTORY_VIEW,
            PERMISSIONS.INVENTORY_CREATE,
            PERMISSIONS.INVENTORY_EDIT,

            PERMISSIONS.EMPLOYEES_VIEW,
            PERMISSIONS.EMPLOYEES_CREATE,
            PERMISSIONS.EMPLOYEES_EDIT,

            PERMISSIONS.ATTENDANCE_VIEW,
            PERMISSIONS.ATTENDANCE_CREATE,
            PERMISSIONS.ATTENDANCE_EDIT,

            PERMISSIONS.SALES_VIEW,
            PERMISSIONS.SALES_CREATE,
            PERMISSIONS.SALES_EDIT,

            PERMISSIONS.INVOICES_VIEW,
            PERMISSIONS.INVOICES_CREATE,
            PERMISSIONS.INVOICES_EDIT,

            PERMISSIONS.REPORTS_VIEW,
            PERMISSIONS.TEAM_VIEW
        ]),

        // Accountant: finance and invoice operations.
        [ROLES.ACCOUNTANT]: Object.freeze([
            PERMISSIONS.DASHBOARD_VIEW,

            PERMISSIONS.FINANCE_VIEW,
            PERMISSIONS.FINANCE_CREATE,
            PERMISSIONS.FINANCE_EDIT,
            PERMISSIONS.FINANCE_EXPORT,

            PERMISSIONS.INVOICES_VIEW,
            PERMISSIONS.INVOICES_CREATE,
            PERMISSIONS.INVOICES_EDIT,

            PERMISSIONS.REPORTS_VIEW,
            PERMISSIONS.REPORTS_EXPORT
        ]),

        // Sales employee: customer and sales operations.
        [ROLES.SALES]: Object.freeze([
            PERMISSIONS.DASHBOARD_VIEW,

            PERMISSIONS.CRM_VIEW,
            PERMISSIONS.CRM_CREATE,
            PERMISSIONS.CRM_EDIT,

            PERMISSIONS.SALES_VIEW,
            PERMISSIONS.SALES_CREATE,
            PERMISSIONS.SALES_EDIT,

            PERMISSIONS.INVOICES_VIEW
        ]),

        // Employee: no access to sensitive modules by default.
        [ROLES.EMPLOYEE]: Object.freeze([
            PERMISSIONS.DASHBOARD_VIEW,
            PERMISSIONS.ATTENDANCE_VIEW
        ])
    });


    // =====================================================
    // 5. PERMISSION CHECK
    //
    // UI DISPLAY HELPER ONLY.
    // Do not use this function as backend authorization.
    // =====================================================

    function hasUiPermission(role, permission) {

        if (
            typeof role !== "string" ||
            typeof permission !== "string"
        ) {
            return false;
        }

        const allowedPermissions = ROLE_PERMISSIONS[role];

        if (!allowedPermissions) {
            return false;
        }

        return allowedPermissions.includes(permission);
    }


    // =====================================================
    // 6. GET DEFAULT ROLE PERMISSIONS
    // =====================================================

    function getDefaultPermissions(role) {

        const permissions = ROLE_PERMISSIONS[role];

        if (!permissions) {
            return [];
        }

        // Return a copy rather than the original array.
        return [...permissions];
    }


    // =====================================================
    // 7. PUBLIC SECURITY CONFIGURATION
    // =====================================================

    window.SynvoraSecurity = Object.freeze({

        config: CONFIG,

        roles: ROLES,

        permissions: PERMISSIONS,

        hasUiPermission: hasUiPermission,

        getDefaultPermissions: getDefaultPermissions

    });


    // =====================================================
    // 8. INITIALIZATION NOTICE
    // =====================================================

    console.info(
        "Synvora AI security configuration loaded.",
        "Frontend configuration only; backend security pending."
    );

})();
```