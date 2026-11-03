// =========================================================
// SYNVORA AI
// EMPLOYEE ATTENDANCE HISTORY
// =========================================================

"use strict";

console.log("Synvora AI - Attendance History Loaded");


// =========================================================
// ATTENDANCE STORAGE KEY
// =========================================================

const ATTENDANCE_HISTORY_STORAGE =
    "synvoraEmployeeAttendance";


// =========================================================
// GET ATTENDANCE RECORDS
// =========================================================

function getAttendanceHistoryRecords() {

    try {

        const data =
            localStorage.getItem(
                ATTENDANCE_HISTORY_STORAGE
            );

        if (!data) {
            return [];
        }

        const records =
            JSON.parse(data);

        return Array.isArray(records)
            ? records
            : [];

    }
    catch (error) {

        console.error(
            "Attendance History data error:",
            error
        );

        return [];

    }

}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeAttendanceHistoryHTML(value) {

    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// =========================================================
// GET ELEMENT
// =========================================================

function getAttendanceHistoryElement(id) {

    return document.getElementById(id);

}


// =========================================================
// INITIALIZE ATTENDANCE HISTORY
// =========================================================

function initializeAttendanceHistory() {

    const tableBody =
        getAttendanceHistoryElement(
            "attendanceHistoryTableBody"
        );

    if (!tableBody) {

        console.log(
            "Attendance History section not loaded yet."
        );

        return;

    }


    bindAttendanceHistoryEvents();

    renderAttendanceHistory();

}


// =========================================================
// BIND EVENTS
// =========================================================

function bindAttendanceHistoryEvents() {

    const searchInput =
        getAttendanceHistoryElement(
            "attendanceHistorySearch"
        );

    const dateInput =
        getAttendanceHistoryElement(
            "attendanceHistoryDate"
        );

    const statusInput =
        getAttendanceHistoryElement(
            "attendanceHistoryStatus"
        );

    const clearButton =
        getAttendanceHistoryElement(
            "clearAttendanceHistoryFiltersBtn"
        );


    // =====================================================
    // SEARCH
    // =====================================================

    if (
        searchInput &&
        !searchInput.dataset.attendanceHistoryBound
    ) {

        searchInput.addEventListener(
            "input",
            renderAttendanceHistory
        );

        searchInput.dataset.attendanceHistoryBound =
            "true";

    }


    // =====================================================
    // DATE FILTER
    // =====================================================

    if (
        dateInput &&
        !dateInput.dataset.attendanceHistoryBound
    ) {

        dateInput.addEventListener(
            "change",
            renderAttendanceHistory
        );

        dateInput.dataset.attendanceHistoryBound =
            "true";

    }


    // =====================================================
    // STATUS FILTER
    // =====================================================

    if (
        statusInput &&
        !statusInput.dataset.attendanceHistoryBound
    ) {

        statusInput.addEventListener(
            "change",
            renderAttendanceHistory
        );

        statusInput.dataset.attendanceHistoryBound =
            "true";

    }


    // =====================================================
    // CLEAR FILTERS
    // =====================================================

    if (
        clearButton &&
        !clearButton.dataset.attendanceHistoryBound
    ) {

        clearButton.addEventListener(
            "click",
            clearAttendanceHistoryFilters
        );

        clearButton.dataset.attendanceHistoryBound =
            "true";

    }

}


// =========================================================
// GET FILTERED RECORDS
// =========================================================

function getFilteredAttendanceHistoryRecords() {

    const records =
        getAttendanceHistoryRecords();


    const searchInput =
        getAttendanceHistoryElement(
            "attendanceHistorySearch"
        );

    const dateInput =
        getAttendanceHistoryElement(
            "attendanceHistoryDate"
        );

    const statusInput =
        getAttendanceHistoryElement(
            "attendanceHistoryStatus"
        );


    const search =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    const selectedDate =
        dateInput
            ? dateInput.value
            : "";


    const selectedStatus =
        statusInput
            ? statusInput.value
            : "";


    return records.filter(function(record) {

        // =================================================
        // EMPLOYEE SEARCH
        // =================================================

        const employeeName =
            String(
                record.employeeName ||
                record.name ||
                ""
            ).toLowerCase();


        const employeeId =
            String(
                record.employeeId ||
                ""
            ).toLowerCase();


        const matchesSearch =
            !search ||
            employeeName.includes(search) ||
            employeeId.includes(search);


        // =================================================
        // DATE FILTER
        // =================================================

        const matchesDate =
            !selectedDate ||
            record.date === selectedDate;


        // =================================================
        // STATUS FILTER
        // =================================================

        const matchesStatus =
            !selectedStatus ||
            String(record.status || "") ===
            selectedStatus;


        return (
            matchesSearch &&
            matchesDate &&
            matchesStatus
        );

    });

}


// =========================================================
// RENDER ATTENDANCE HISTORY
// =========================================================

function renderAttendanceHistory() {

    const tableBody =
        getAttendanceHistoryElement(
            "attendanceHistoryTableBody"
        );

    const emptyState =
        getAttendanceHistoryElement(
            "attendanceHistoryEmpty"
        );

    if (!tableBody) {
        return;
    }


    const records =
        getFilteredAttendanceHistoryRecords();


    // =====================================================
    // CLEAR TABLE
    // =====================================================

    tableBody.innerHTML = "";


    // =====================================================
    // EMPTY STATE
    // =====================================================

    if (records.length === 0) {

        if (emptyState) {
            emptyState.style.display = "block";
        }

        updateAttendanceHistorySummary([]);

        return;

    }


    if (emptyState) {
        emptyState.style.display = "none";
    }


    // =====================================================
    // SORT RECORDS
    // Latest first
    // =====================================================

    records.sort(function(a, b) {

        const dateA =
            new Date(
                a.checkInTimestamp ||
                a.createdAt ||
                a.date ||
                0
            ).getTime();

        const dateB =
            new Date(
                b.checkInTimestamp ||
                b.createdAt ||
                b.date ||
                0
            ).getTime();

        return dateB - dateA;

    });


    // =====================================================
    // CREATE TABLE ROWS
    // =====================================================

    records.forEach(function(record) {

        const row =
            document.createElement("tr");


        // =================================================
        // EMPLOYEE
        // =================================================

        const employeeCell =
            document.createElement("td");

        employeeCell.innerHTML = `

            <div class="attendance-history-employee">

                <div class="attendance-history-avatar">
                    👤
                </div>

                <div>

                    <strong>
                        ${escapeAttendanceHistoryHTML(
                            record.employeeName ||
                            record.name ||
                            "Employee"
                        )}
                    </strong>

                    <small>
                        ID:
                        ${escapeAttendanceHistoryHTML(
                            record.employeeId ||
                            "-"
                        )}
                    </small>

                </div>

            </div>

        `;


        // =================================================
        // DATE
        // =================================================

        const dateCell =
            document.createElement("td");

        dateCell.textContent =
            record.date || "-";


        // =================================================
        // CHECK IN
        // =================================================

        const checkInCell =
            document.createElement("td");

        if (record.checkIn) {

            checkInCell.innerHTML = `

                <span class="attendance-history-time check-in">
                    🟢
                    ${escapeAttendanceHistoryHTML(
                        record.checkIn
                    )}
                </span>

            `;

        }
        else {

            checkInCell.textContent = "-";

        }


        // =================================================
        // CHECK OUT
        // =================================================

        const checkOutCell =
            document.createElement("td");

        if (record.checkOut) {

            checkOutCell.innerHTML = `

                <span class="attendance-history-time check-out">
                    🔴
                    ${escapeAttendanceHistoryHTML(
                        record.checkOut
                    )}
                </span>

            `;

        }
        else {

            checkOutCell.innerHTML = `

                <span class="attendance-history-not-checked-out">
                    —
                </span>

            `;

        }


        // =================================================
        // WORKING HOURS
        // =================================================

        const workingHoursCell =
            document.createElement("td");

        const hours =
            Number(
                record.workingHours || 0
            );


        if (
            record.checkIn &&
            record.checkOut
        ) {

            workingHoursCell.innerHTML = `

                <strong>
                    ${hours.toFixed(2)} hrs
                </strong>

            `;

        }
        else {

            workingHoursCell.innerHTML = `

                <span>
                    —
                </span>

            `;

        }


        // =================================================
        // STATUS
        // =================================================

        const statusCell =
            document.createElement("td");

        const status =
            record.status ||
            "Present";


        const statusClass =
            getAttendanceHistoryStatusClass(
                record
            );


        statusCell.innerHTML = `

            <span class="
                attendance-history-status
                ${statusClass}
            ">

                ${getAttendanceHistoryStatusIcon(
                    record
                )}

                ${escapeAttendanceHistoryHTML(
                    getAttendanceHistoryDisplayStatus(
                        record
                    )
                )}

            </span>

        `;


        // =================================================
        // APPEND CELLS
        // =================================================

        row.appendChild(
            employeeCell
        );

        row.appendChild(
            dateCell
        );

        row.appendChild(
            checkInCell
        );

        row.appendChild(
            checkOutCell
        );

        row.appendChild(
            workingHoursCell
        );

        row.appendChild(
            statusCell
        );


        tableBody.appendChild(row);

    });


    // =====================================================
    // UPDATE SUMMARY
    // =====================================================

    updateAttendanceHistorySummary(
        records
    );

}


// =========================================================
// GET DISPLAY STATUS
// =========================================================

function getAttendanceHistoryDisplayStatus(record) {

    if (
        record.checkIn &&
        record.checkOut
    ) {

        return "Present";

    }


    if (record.checkIn) {

        return "Checked In";

    }


    return record.status ||
        "Present";

}


// =========================================================
// GET STATUS CLASS
// =========================================================

function getAttendanceHistoryStatusClass(record) {

    if (
        record.checkIn &&
        record.checkOut
    ) {

        return "present";

    }


    if (record.checkIn) {

        return "checked-in";

    }


    const status =
        String(
            record.status || ""
        ).toLowerCase();


    if (status === "absent") {
        return "absent";
    }


    if (status === "late") {
        return "late";
    }


    return "present";

}


// =========================================================
// GET STATUS ICON
// =========================================================

function getAttendanceHistoryStatusIcon(record) {

    if (
        record.checkIn &&
        record.checkOut
    ) {

        return "✅";

    }


    if (record.checkIn) {

        return "🟢";

    }


    const status =
        String(
            record.status || ""
        ).toLowerCase();


    if (status === "absent") {
        return "🔴";
    }


    if (status === "late") {
        return "🟡";
    }


    return "🟢";

}


// =========================================================
// UPDATE SUMMARY
// =========================================================

function updateAttendanceHistorySummary(
    records
) {

    const totalElement =
        getAttendanceHistoryElement(
            "attendanceHistoryTotal"
        );

    const presentElement =
        getAttendanceHistoryElement(
            "attendanceHistoryPresent"
        );

    const checkedInElement =
        getAttendanceHistoryElement(
            "attendanceHistoryCheckedIn"
        );

    const completedElement =
        getAttendanceHistoryElement(
            "attendanceHistoryCompleted"
        );


    // =====================================================
    // TOTAL
    // =====================================================

    if (totalElement) {

        totalElement.innerText =
            records.length;

    }


    // =====================================================
    // PRESENT
    // =====================================================

    const present =
        records.filter(function(record) {

            return String(
                record.status || ""
            ).toLowerCase() ===
            "present";

        }).length;


    if (presentElement) {

        presentElement.innerText =
            present;

    }


    // =====================================================
    // CHECKED IN
    // =====================================================

    const checkedIn =
        records.filter(function(record) {

            return (
                record.checkIn &&
                !record.checkOut
            );

        }).length;


    if (checkedInElement) {

        checkedInElement.innerText =
            checkedIn;

    }


    // =====================================================
    // COMPLETED
    // =====================================================

    const completed =
        records.filter(function(record) {

            return (
                record.checkIn &&
                record.checkOut
            );

        }).length;


    if (completedElement) {

        completedElement.innerText =
            completed;

    }

}


// =========================================================
// CLEAR FILTERS
// =========================================================

function clearAttendanceHistoryFilters() {

    const searchInput =
        getAttendanceHistoryElement(
            "attendanceHistorySearch"
        );

    const dateInput =
        getAttendanceHistoryElement(
            "attendanceHistoryDate"
        );

    const statusInput =
        getAttendanceHistoryElement(
            "attendanceHistoryStatus"
        );


    if (searchInput) {
        searchInput.value = "";
    }


    if (dateInput) {
        dateInput.value = "";
    }


    if (statusInput) {
        statusInput.value = "";
    }


    renderAttendanceHistory();

}


// =========================================================
// REFRESH ATTENDANCE HISTORY
// =========================================================

function refreshAttendanceHistory() {

    const tableBody =
        getAttendanceHistoryElement(
            "attendanceHistoryTableBody"
        );


    if (!tableBody) {
        return;
    }


    renderAttendanceHistory();

}


// =========================================================
// AUTO REFRESH
// =========================================================

function startAttendanceHistoryAutoRefresh() {

    if (
        window.attendanceHistoryRefreshInterval
    ) {

        clearInterval(
            window.attendanceHistoryRefreshInterval
        );

    }


    window.attendanceHistoryRefreshInterval =
        setInterval(function() {

            if (
                document.getElementById(
                    "attendanceHistoryTableBody"
                )
            ) {

                renderAttendanceHistory();

            }

        }, 1000);

}


// =========================================================
// INITIALIZE WHEN DOM IS READY
// =========================================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        function() {

            initializeAttendanceHistory();

            startAttendanceHistoryAutoRefresh();

        }
    );

}
else {

    initializeAttendanceHistory();

    startAttendanceHistoryAutoRefresh();

}


// =========================================================
// EXPOSE FUNCTIONS
// =========================================================

window.initializeAttendanceHistory =
    initializeAttendanceHistory;

window.renderAttendanceHistory =
    renderAttendanceHistory;

window.refreshAttendanceHistory =
    refreshAttendanceHistory;

window.clearAttendanceHistoryFilters =
    clearAttendanceHistoryFilters;

window.getAttendanceHistoryRecords =
    getAttendanceHistoryRecords;


// =========================================================a
// READY
// =========================================================

console.log(
    "Synvora AI - Attendance History System Ready"
);