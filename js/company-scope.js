"use strict";

(function () {
    const RECORD_KEYS = new Set([
        "incomes",
        "expenses",
        "invoices",
        "salesOrders",
        "customers",
        "synvoraCRMCustomers",
        "employees",
        "synvoraEmployeeTasks",
        "synvoraEmployeeAttendance",
        "employeeAttendance",
        "attendanceRecords",
        "synvoraInventoryProducts",
        "synvoraInventoryMovements",
        "synvoraBusinessMeetings",
        "synvoraBusinessWorkflows",
        "synvoraBusinessWorkflowRuns"
    ]);
    const MIGRATION_KEY = "synvoraCompanyScopeV1Migrated";
    const nativeGetItem = Storage.prototype.getItem;
    const nativeSetItem = Storage.prototype.setItem;
    const nativeRemoveItem = Storage.prototype.removeItem;

    function parseJSON(value) {
        try {
            return JSON.parse(value);
        } catch (_) {
            return null;
        }
    }

    function companyIdFrom(value) {
        const parsed = parseJSON(value);
        if (parsed && typeof parsed === "object") return String(parsed.id || "");
        return String(parsed || value || "");
    }

    function activeCompanyId() {
        return companyIdFrom(nativeGetItem.call(localStorage, "synvoraActiveCompany")) ||
            companyIdFrom(nativeGetItem.call(localStorage, "synvoraActiveCompanyId"));
    }

    function getCompanies() {
        const companies = parseJSON(nativeGetItem.call(localStorage, "synvoraCompanies"));
        return Array.isArray(companies) ? companies : [];
    }

    function migrateLegacyRecords() {
        if (nativeGetItem.call(localStorage, MIGRATION_KEY) === "1") return;
        const companies = getCompanies();
        if (!companies.length) return;

        // Keep existing global records in one primary workspace, never duplicate them.
        const oldestCompany = companies.slice().sort((a, b) => {
            const firstDate = Date.parse(a.createdAt || "") || 0;
            const secondDate = Date.parse(b.createdAt || "") || 0;
            return firstDate - secondDate;
        })[0];
        const legacyCompanyId = String(oldestCompany.id || "");
        if (!legacyCompanyId) return;

        try {
            for (const key of RECORD_KEYS) {
                const raw = nativeGetItem.call(localStorage, key);
                if (raw === null) continue;
                const records = JSON.parse(raw);
                if (!Array.isArray(records)) {
                    throw new TypeError(`Saved data in "${key}" is not a list.`);
                }
                const migrated = records.map(record => {
                    if (!record || typeof record !== "object" || Array.isArray(record)) {
                        throw new TypeError(`Saved data in "${key}" contains an invalid record.`);
                    }
                    return record.companyId
                        ? record
                        : { ...record, companyId: legacyCompanyId };
                });
                if (migrated.some((record, index) => record !== records[index])) {
                    nativeSetItem.call(localStorage, key, JSON.stringify(migrated));
                }
            }
            nativeSetItem.call(localStorage, MIGRATION_KEY, "1");
        } catch (error) {
            console.error("[Company workspace] Legacy records could not be assigned to a company:", error);
        }
    }

    function scopedRecords(storage, key) {
        const raw = nativeGetItem.call(storage, key);
        if (raw === null) return null;
        const records = JSON.parse(raw);
        if (!Array.isArray(records)) return raw;
        const companyId = activeCompanyId();
        if (!companyId) return "[]";
        return JSON.stringify(records.filter(record =>
            record && typeof record === "object" && String(record.companyId || "") === companyId
        ));
    }

    Storage.prototype.getItem = function (key) {
        const normalizedKey = String(key);
        if (this === localStorage && RECORD_KEYS.has(normalizedKey)) {
            try {
                const scoped = scopedRecords(this, normalizedKey);
                if (scoped !== null) return scoped;
            } catch (error) {
                console.error(`[Company workspace] Could not read "${normalizedKey}":`, error);
                throw error;
            }
        }
        return nativeGetItem.call(this, key);
    };

    Storage.prototype.setItem = function (key, value) {
        const normalizedKey = String(key);
        if (this !== localStorage || !RECORD_KEYS.has(normalizedKey)) {
            return nativeSetItem.call(this, key, value);
        }

        const records = parseJSON(String(value));
        if (!Array.isArray(records)) return nativeSetItem.call(this, key, value);

        const companyId = activeCompanyId();
        if (!companyId) {
            throw new DOMException("Select an active company before saving business records.", "InvalidStateError");
        }

        const invalidRecord = records.find(record =>
            !record || typeof record !== "object" || Array.isArray(record) ||
            (record.companyId && String(record.companyId) !== companyId)
        );
        if (invalidRecord) {
            throw new DOMException("This record belongs to a different company workspace.", "InvalidStateError");
        }

        const currentRaw = nativeGetItem.call(this, normalizedKey);
        const currentRecords = currentRaw === null ? [] : parseJSON(currentRaw);
        if (!Array.isArray(currentRecords)) {
            throw new TypeError(`Saved data in "${normalizedKey}" is not a list.`);
        }
        const otherCompanies = currentRecords.filter(record =>
            record && typeof record === "object" && String(record.companyId || "") !== companyId
        );
        const scopedRecords = records.map(record => ({ ...record, companyId }));
        return nativeSetItem.call(this, normalizedKey, JSON.stringify([...otherCompanies, ...scopedRecords]));
    };

    Storage.prototype.removeItem = function (key) {
        const normalizedKey = String(key);
        if (this !== localStorage || !RECORD_KEYS.has(normalizedKey)) {
            return nativeRemoveItem.call(this, key);
        }
        this.setItem(normalizedKey, "[]");
    };

    function notifyCompanyChange() {
        migrateLegacyRecords();
        window.dispatchEvent(new CustomEvent("synvora:company-changed", {
            detail: {
                companyId: activeCompanyId(),
                company: getCompanies().find(company =>
                    String(company.id) === activeCompanyId()
                ) || null
            }
        }));
    }

    window.SynvoraCompanyScope = {
        getActiveCompanyId: activeCompanyId,
        getActiveCompany: function () {
            const companyId = activeCompanyId();
            return getCompanies().find(company =>
                String(company.id) === companyId
            ) || null;
        },
        notifyCompanyChange
    };

    migrateLegacyRecords();
    window.addEventListener("storage", event => {
        if (event.key === "synvoraActiveCompany" || event.key === "synvoraActiveCompanyId") {
            notifyCompanyChange();
        }
    });
})();
