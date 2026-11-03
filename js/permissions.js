/* =========================================================
   SYNVORA AI — PERMISSIONS MANAGER
   File: js/permissions.js
   Version: 1.0.0

   PURPOSE:
   1. Check role-based permissions.
   2. Support custom employee permissions.
   3. Check module access.
   4. Support future Supabase integration.

   SECURITY NOTICE:
   Frontend permissions are NOT security boundaries.
   Enforce all real permissions in the backend/database.
========================================================= */

(function () {
    "use strict";

    // Prevent duplicate initialization.
    if (window.SynvoraPermissions) {
        console.warn("Synvora Permissions already initialized.");
        return;
    }

    // -----------------------------------------------------
    // 1. CHECK SECURITY CONFIGURATION
    // -----------------------------------------------------

    function getSecurityConfig() {
        return window.SynvoraSecurity || null;
    }

    function getPermissionConstants() {
        const security = getSecurityConfig();

        return security?.permissions || null;
    }

    // -----------------------------------------------------
    // 2. VALIDATE ROLE
    // -----------------------------------------------------

    function isValidRole(role) {
        const security = getSecurityConfig();

        if (!security || !security.roles) {
            return false;
        }

        return Object.values(security.roles).includes(role);
    }

    // -----------------------------------------------------
    // 3. GET DEFAULT ROLE PERMISSIONS
    // -----------------------------------------------------

    function getRolePermissions(role) {
        const security = getSecurityConfig();

        if (!security || !isValidRole(role)) {
            return [];
        }

        return security.getDefaultPermissions(role);
    }

    // -----------------------------------------------------
    // 4. CHECK A SINGLE PERMISSION
    //
    // customPermissions:
    // null = use role defaults
    // []   = no permissions
    // [...] = explicitly assigned permissions
    // -----------------------------------------------------

    function hasPermission(
        role,
        permission,
        customPermissions = null
    ) {
        const security = getSecurityConfig();
        const permissionConstants = getPermissionConstants();

        if (!security || !permissionConstants) {
            return false;
        }

        if (!isValidRole(role)) {
            return false;
        }

        // Reject unknown permission names.
        const knownPermissions = Object.values(permissionConstants);

        if (!knownPermissions.includes(permission)) {
            return false;
        }

        // Explicitly assigned permissions replace role defaults.
        if (customPermissions !== null) {
            if (!Array.isArray(customPermissions)) {
                return false;
            }

            return customPermissions.includes(permission);
        }

        return security.hasUiPermission(role, permission);
    }

    // -----------------------------------------------------
    // 5. CHECK MULTIPLE PERMISSIONS
    //
    // mode = "all": user needs every permission.
    // mode = "any": user needs at least one permission.
    // -----------------------------------------------------

    function hasPermissions(
        role,
        permissions,
        customPermissions = null,
        mode = "all"
    ) {
        if (!Array.isArray(permissions)) {
            return false;
        }

        if (!["all", "any"].includes(mode)) {
            return false;
        }

        if (permissions.length === 0) {
            return false;
        }

        const results = permissions.map(permission =>
            hasPermission(role, permission, customPermissions)
        );

        return mode === "all"
            ? results.every(Boolean)
            : results.some(Boolean);
    }

    // -----------------------------------------------------
    // 6. CHECK MODULE ACCESS
    // -----------------------------------------------------

    function canAccessModule(
        role,
        moduleName,
        customPermissions = null
    ) {
        const permissionConstants = getPermissionConstants();

        if (!permissionConstants) {
            return false;
        }

        const modulePermissions = {
            dashboard: permissionConstants.DASHBOARD_VIEW,

            finance: permissionConstants.FINANCE_VIEW,

            crm: permissionConstants.CRM_VIEW,

            inventory: permissionConstants.INVENTORY_VIEW,

            employees: permissionConstants.EMPLOYEES_VIEW,

            attendance: permissionConstants.ATTENDANCE_VIEW,

            sales: permissionConstants.SALES_VIEW,

            invoices: permissionConstants.INVOICES_VIEW,

            reports: permissionConstants.REPORTS_VIEW,

            companySettings:
                permissionConstants.COMPANY_SETTINGS_VIEW,

            team: permissionConstants.TEAM_VIEW
        };

        const permission = modulePermissions[moduleName];

        if (!permission) {
            return false;
        }

        return hasPermission(
            role,
            permission,
            customPermissions
        );
    }

    // -----------------------------------------------------
    // 7. CHECK RECORD OWNERSHIP CONTEXT
    //
    // This is a UI consistency helper only.
    // It does NOT securely validate company ownership.
    // The backend must verify membership and record access.
    // -----------------------------------------------------

    function matchesActiveCompany(
        recordCompanyId,
        activeCompanyId
    ) {
        if (
            typeof recordCompanyId !== "string" ||
            typeof activeCompanyId !== "string" ||
            !recordCompanyId ||
            !activeCompanyId
        ) {
            return false;
        }

        return recordCompanyId === activeCompanyId;
    }

    // -----------------------------------------------------
    // 8. FILTER RECORDS FOR UI DISPLAY
    //
    // Use only for display convenience.
    // Fetch already-authorized records from the backend.
    // -----------------------------------------------------

    function filterRecordsByCompany(
        records,
        activeCompanyId
    ) {
        if (!Array.isArray(records)) {
            return [];
        }

        if (
            typeof activeCompanyId !== "string" ||
            !activeCompanyId
        ) {
            return [];
        }

        return records.filter(record =>
            matchesActiveCompany(
                record?.company_id,
                activeCompanyId
            )
        );
    }

    // -----------------------------------------------------
    // 9. SAFE PERMISSION SUMMARY
    // -----------------------------------------------------

    function getPermissionSummary(
        role,
        customPermissions = null
    ) {
        const security = getSecurityConfig();

        if (!security || !isValidRole(role)) {
            return {
                validRole: false,
                role: null,
                permissions: []
            };
        }

        let permissions;

        if (customPermissions === null) {
            permissions = getRolePermissions(role);
        } else if (Array.isArray(customPermissions)) {
            const knownPermissions = Object.values(
                security.permissions
            );

            permissions = customPermissions.filter(permission =>
                knownPermissions.includes(permission)
            );
        } else {
            permissions = [];
        }

        return {
            validRole: true,
            role: role,
            permissions: [...permissions]
        };
    }

    // -----------------------------------------------------
    // 10. PUBLIC API
    // -----------------------------------------------------

    window.SynvoraPermissions = Object.freeze({
        isValidRole,
        getRolePermissions,
        hasPermission,
        hasPermissions,
        canAccessModule,
        matchesActiveCompany,
        filterRecordsByCompany,
        getPermissionSummary
    });

    console.info(
        "Synvora Permissions loaded. Backend enforcement pending."
    );

})();