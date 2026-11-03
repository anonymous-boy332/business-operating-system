/* ==========================================
   SYNVORA AI - COMPANY DATA ENGINE
   Multi-Company Data Isolation System
========================================== */

console.log("Synvora Company Data Engine Loaded");


/* ==========================================
   STORAGE KEYS
========================================== */

const SYNVORA_COMPANIES_KEY = "synvoraCompanies";
const SYNVORA_ACTIVE_COMPANY_KEY = "synvoraActiveCompanyId";
const SYNVORA_COMPANY_DATA_KEY = "synvoraCompanyData";


/* ==========================================
   GET ALL COMPANIES
========================================== */

function getAllCompanies() {

    try {

        return JSON.parse(
            localStorage.getItem(
                SYNVORA_COMPANIES_KEY
            )
        ) || [];

    }
    catch(error) {

        console.error(
            "Company Storage Error:",
            error
        );

        return [];

    }

}


/* ==========================================
   GET ACTIVE COMPANY ID
========================================== */

function getActiveCompanyId() {

    return localStorage.getItem(
        SYNVORA_ACTIVE_COMPANY_KEY
    );

}


/* ==========================================
   GET ACTIVE COMPANY
========================================== */

function getActiveCompany() {

    const companyId =
        getActiveCompanyId();

    if(!companyId) {
        return null;
    }

    const companies =
        getAllCompanies();

    return companies.find(
        company =>
            String(company.id) ===
            String(companyId)
    ) || null;

}


/* ==========================================
   SET ACTIVE COMPANY
========================================== */

function setActiveCompany(companyId) {

    const companies =
        getAllCompanies();

    const company =
        companies.find(
            item =>
                String(item.id) ===
                String(companyId)
        );

    if(!company) {

        console.error(
            "Cannot activate company. Company not found:",
            companyId
        );

        return false;

    }

    localStorage.setItem(
        SYNVORA_ACTIVE_COMPANY_KEY,
        String(company.id)
    );

    /*
        Keep old active-company object
        synchronized for compatibility
        with existing Synvora code.
    */

    localStorage.setItem(
        "synvoraActiveCompany",
        JSON.stringify(company)
    );

    console.log(
        "Active Company:",
        company.name,
        company.id
    );

    return true;

}


/* ==========================================
   GET COMPLETE COMPANY DATA STORE
========================================== */

function getCompanyDataStore() {

    try {

        return JSON.parse(
            localStorage.getItem(
                SYNVORA_COMPANY_DATA_KEY
            )
        ) || {};

    }
    catch(error) {

        console.error(
            "Company Data Store Error:",
            error
        );

        return {};

    }

}


/* ==========================================
   SAVE COMPLETE COMPANY DATA STORE
========================================== */

function saveCompanyDataStore(data) {

    localStorage.setItem(
        SYNVORA_COMPANY_DATA_KEY,
        JSON.stringify(data)
    );

}


/* ==========================================
   CREATE COMPANY DATA SPACE
========================================== */

function initializeCompanyData(companyId) {

    if(!companyId) {
        return null;
    }

    const data =
        getCompanyDataStore();

    if(!data[companyId]) {

        data[companyId] = {

            employees: [],
            transactions: [],
            expenses: [],
            invoices: [],
            customers: [],
            leads: [],
            deals: [],
            inventory: [],
            products: [],
            suppliers: [],
            sales: [],
            orders: [],
            reports: [],
            activities: [],
            notes: [],

            finance: {
                income: [],
                expenses: [],
                payments: [],
                balances: []
            }

        };

        saveCompanyDataStore(data);

    }

    return data[companyId];

}


/* ==========================================
   GET ACTIVE COMPANY DATA
========================================== */

function getActiveCompanyData() {

    const companyId =
        getActiveCompanyId();

    if(!companyId) {

        console.warn(
            "No active company selected."
        );

        return null;

    }

    return initializeCompanyData(
        companyId
    );

}


/* ==========================================
   GET COMPANY DATA
========================================== */

function getCompanyData(
    moduleName,
    companyId = null
) {

    const targetCompanyId =
        companyId ||
        getActiveCompanyId();

    if(!targetCompanyId) {

        console.warn(
            "No company selected for:",
            moduleName
        );

        return [];

    }

    const companyData =
        initializeCompanyData(
            targetCompanyId
        );

    if(!companyData) {
        return [];
    }

    if(
        !Object.prototype.hasOwnProperty.call(
            companyData,
            moduleName
        )
    ) {

        companyData[moduleName] = [];

        const store =
            getCompanyDataStore();

        store[targetCompanyId] =
            companyData;

        saveCompanyDataStore(
            store
        );

    }

    return companyData[moduleName];

}


/* ==========================================
   SAVE COMPANY MODULE DATA
========================================== */

function saveCompanyData(
    moduleName,
    moduleData,
    companyId = null
) {

    const targetCompanyId =
        companyId ||
        getActiveCompanyId();

    if(!targetCompanyId) {

        console.error(
            "Cannot save data. No active company."
        );

        return false;

    }

    const store =
        getCompanyDataStore();

    if(!store[targetCompanyId]) {

        initializeCompanyData(
            targetCompanyId
        );

    }

    /*
        Reload store because
        initializeCompanyData()
        may have changed it.
    */

    const updatedStore =
        getCompanyDataStore();

    if(!updatedStore[targetCompanyId]) {

        updatedStore[targetCompanyId] = {};

    }

    updatedStore[targetCompanyId][
        moduleName
    ] = moduleData;

    saveCompanyDataStore(
        updatedStore
    );

    return true;

}


/* ==========================================
   ADD COMPANY RECORD
========================================== */

function addCompanyRecord(
    moduleName,
    record
) {

    const companyId =
        getActiveCompanyId();

    if(!companyId) {

        console.error(
            "Cannot add record. No active company."
        );

        return null;

    }

    const records =
        getCompanyData(
            moduleName,
            companyId
        );

    const newRecord = {

        id:
            record.id ||
            `${moduleName}_${Date.now()}_${Math.random()
                .toString(36)
                .substring(2, 9)}`,

        companyId:
            companyId,

        createdAt:
            record.createdAt ||
            new Date().toISOString(),

        ...record,

        /*
            companyId is always controlled
            by the data engine.
        */

        companyId:
            companyId

    };

    records.push(
        newRecord
    );

    saveCompanyData(
        moduleName,
        records,
        companyId
    );

    return newRecord;

}


/* ==========================================
   UPDATE COMPANY RECORD
========================================== */

function updateCompanyRecord(
    moduleName,
    recordId,
    updates
) {

    const companyId =
        getActiveCompanyId();

    if(!companyId) {
        return false;
    }

    const records =
        getCompanyData(
            moduleName,
            companyId
        );

    const index =
        records.findIndex(
            record =>
                String(record.id) ===
                String(recordId)
        );

    if(index === -1) {

        console.warn(
            "Record not found:",
            recordId
        );

        return false;

    }

    /*
        Never allow another company ID
        to be injected accidentally.
    */

    records[index] = {

        ...records[index],

        ...updates,

        id:
            records[index].id,

        companyId:
            companyId

    };

    saveCompanyData(
        moduleName,
        records,
        companyId
    );

    return true;

}


/* ==========================================
   DELETE COMPANY RECORD
========================================== */

function deleteCompanyRecord(
    moduleName,
    recordId
) {

    const companyId =
        getActiveCompanyId();

    if(!companyId) {
        return false;
    }

    const records =
        getCompanyData(
            moduleName,
            companyId
        );

    const filtered =
        records.filter(
            record =>
                String(record.id) !==
                String(recordId)
        );

    if(
        filtered.length ===
        records.length
    ) {

        return false;

    }

    saveCompanyData(
        moduleName,
        filtered,
        companyId
    );

    return true;

}


/* ==========================================
   CLEAR COMPANY MODULE DATA
========================================== */

function clearCompanyModule(
    moduleName,
    companyId = null
) {

    const targetCompanyId =
        companyId ||
        getActiveCompanyId();

    if(!targetCompanyId) {
        return false;
    }

    const store =
        getCompanyDataStore();

    if(!store[targetCompanyId]) {
        return false;
    }

    store[targetCompanyId][
        moduleName
    ] = [];

    saveCompanyDataStore(
        store
    );

    return true;

}


/* ==========================================
   GET COMPANY STATISTICS
========================================== */

function getCompanyStatistics(
    companyId = null
) {

    const targetCompanyId =
        companyId ||
        getActiveCompanyId();

    if(!targetCompanyId) {

        return {

            revenue: 0,
            employees: 0,
            orders: 0,
            customers: 0,
            expenses: 0,
            invoices: 0

        };

    }

    const data =
        initializeCompanyData(
            targetCompanyId
        );

    if(!data) {

        return {

            revenue: 0,
            employees: 0,
            orders: 0,
            customers: 0,
            expenses: 0,
            invoices: 0

        };

    }

    const transactions =
        Array.isArray(data.transactions)
            ? data.transactions
            : [];

    const employees =
        Array.isArray(data.employees)
            ? data.employees
            : [];

    const orders =
        Array.isArray(data.orders)
            ? data.orders
            : [];

    const customers =
        Array.isArray(data.customers)
            ? data.customers
            : [];

    const expenses =
        Array.isArray(data.expenses)
            ? data.expenses
            : [];

    const invoices =
        Array.isArray(data.invoices)
            ? data.invoices
            : [];


    /*
        Revenue calculation
    */

    const revenue =
        transactions.reduce(
            (total, transaction) => {

                const type =
                    String(
                        transaction.type ||
                        ""
                    ).toLowerCase();

                if(
                    type === "income" ||
                    type === "sale" ||
                    type === "revenue"
                ) {

                    return total +
                        Number(
                            transaction.amount ||
                            transaction.total ||
                            0
                        );

                }

                return total;

            },
            0
        );


    /*
        Expense calculation
    */

    const expenseTotal =
        expenses.reduce(
            (total, expense) => {

                return total +
                    Number(
                        expense.amount ||
                        expense.total ||
                        0
                    );

            },
            0
        );


    return {

        revenue:
            revenue,

        employees:
            employees.length,

        orders:
            orders.length,

        customers:
            customers.length,

        expenses:
            expenseTotal,

        invoices:
            invoices.length

    };

}


/* ==========================================
   COMPANY DATA SUMMARY
========================================== */

function getActiveCompanySummary() {

    const company =
        getActiveCompany();

    if(!company) {

        return null;

    }

    const statistics =
        getCompanyStatistics(
            company.id
        );

    return {

        ...company,

        ...statistics

    };

}


/* ==========================================
   INITIALIZE ALL EXISTING COMPANIES
========================================== */

function initializeAllCompanyData() {

    const companies =
        getAllCompanies();

    companies.forEach(
        company => {

            initializeCompanyData(
                company.id
            );

        }
    );

    console.log(
        "Company data spaces initialized:",
        companies.length
    );

}


/* ==========================================
   COMPANY DELETION CLEANUP
========================================== */

function deleteCompanyData(
    companyId
) {

    if(!companyId) {
        return false;
    }

    const store =
        getCompanyDataStore();

    if(
        !store[companyId]
    ) {

        return true;

    }

    delete store[
        companyId
    ];

    saveCompanyDataStore(
        store
    );

    /*
        If deleted company was active,
        remove active selection.
    */

    if(
        String(
            getActiveCompanyId()
        ) ===
        String(companyId)
    ) {

        localStorage.removeItem(
            SYNVORA_ACTIVE_COMPANY_KEY
        );

        localStorage.removeItem(
            "synvoraActiveCompany"
        );

    }

    console.log(
        "Company data deleted:",
        companyId
    );

    return true;

}


/* ==========================================
   DEBUG FUNCTION
========================================== */

function debugCompanyData() {

    const company =
        getActiveCompany();

    const data =
        getActiveCompanyData();

    console.log(
        "================================"
    );

    console.log(
        "ACTIVE COMPANY:",
        company
    );

    console.log(
        "COMPANY DATA:",
        data
    );

    console.log(
        "STATISTICS:",
        getCompanyStatistics()
    );

    console.log(
        "================================"
    );

}


/* ==========================================
   INITIALIZATION
========================================== */

initializeAllCompanyData();
