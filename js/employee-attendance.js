// =========================================================
// SYNVORA AI
// EMPLOYEE ATTENDANCE SYSTEM
// =========================================================

"use strict";

console.log("Synvora AI - Employee Attendance Loaded");


// =========================================================
// ATTENDANCE STORAGE KEY
// =========================================================

const EMPLOYEE_ATTENDANCE_STORAGE =
    "synvoraEmployeeAttendance";


// =========================================================
// GET ATTENDANCE RECORDS
// =========================================================

function getEmployeeAttendanceRecords() {

    try {

        const data =
            localStorage.getItem(
                EMPLOYEE_ATTENDANCE_STORAGE
            );

        if (!data) return [];

        const records =
            JSON.parse(data);

        return Array.isArray(records)
            ? records
            : [];

    }
    catch (error) {

        console.error(
            "Attendance data error:",
            error
        );

        return [];

    }

}


// =========================================================
// SAVE ATTENDANCE RECORDS
// =========================================================

function saveEmployeeAttendanceRecords(records) {

    localStorage.setItem(
        EMPLOYEE_ATTENDANCE_STORAGE,
        JSON.stringify(records)
    );

}


// =========================================================
// GET CURRENT EMPLOYEE
// =========================================================

function getCurrentEmployee() {

    /*
        IMPORTANT:

        Ye system employee ke current login/session
        ko identify karne ke liye multiple possible
        localStorage keys check karta hai.

        Baad mein jab real authentication banega,
        is function ko real logged-in employee ID
        ke saath connect kar denge.
    */

    const employeeId =
        localStorage.getItem("currentEmployeeId") ||
        localStorage.getItem("loggedInEmployeeId") ||
        localStorage.getItem("selectedEmployeeId");


    if (employeeId) {

        if (
            typeof employees !== "undefined" &&
            Array.isArray(employees)
        ) {

            const employee =
                employees.find(function(item) {

                    return String(item.id) ===
                        String(employeeId);

                });


            if (employee) {

                return employee;

            }

        }

    }


    /*
        Agar current employee ID nahi mili
        to selected employee use karenge.
    */

    if (
        typeof employees !== "undefined" &&
        Array.isArray(employees) &&
        employees.length === 1
    ) {

        return employees[0];

    }


    return null;

}


// =========================================================
// FORMAT TIME
// =========================================================

function formatAttendanceTime(date) {

    return date.toLocaleTimeString(
        [],
        {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }
    );

}


// =========================================================
// FORMAT DATE
// =========================================================

function getAttendanceDate() {

    const date =
        new Date();

    return date
        .toISOString()
        .split("T")[0];

}


// =========================================================
// GENERATE ATTENDANCE ID
// =========================================================

function generateAttendanceId() {

    return (
        "ATT-" +
        Date.now() +
        "-" +
        Math.floor(
            Math.random() * 1000
        )
    );

}


// =========================================================
// FIND TODAY'S ATTENDANCE
// =========================================================

function getTodayEmployeeAttendance(employeeId) {

    const records =
        getEmployeeAttendanceRecords();

    const today =
        getAttendanceDate();

    return records.find(function(record) {

        return (
            String(record.employeeId) ===
            String(employeeId)
            &&
            record.date === today
        );

    }) || null;

}


// =========================================================
// OPEN ATTENDANCE
// =========================================================

function openEmployeeAttendance() {

    console.log(
        "Opening Employee Attendance..."
    );


    const employee =
        getCurrentEmployee();


    if (!employee) {

        alert(
            "No employee is currently selected."
        );

        return;

    }


    const existingModal =
        document.getElementById(
            "employeeAttendanceModal"
        );


    if (existingModal) {

        return;

    }


    const todayAttendance =
        getTodayEmployeeAttendance(
            employee.id
        );


    const modal =
        document.createElement("div");


    modal.id =
        "employeeAttendanceModal";


    modal.className =
        "employee-attendance-overlay";


    modal.innerHTML = `

        <div class="employee-attendance-modal">

            <div class="employee-attendance-header">

                <div>

                    <span class="employee-attendance-eyebrow">
                        EMPLOYEE ATTENDANCE
                    </span>

                    <h2>
                        ⏰ Attendance
                    </h2>

                </div>


                <button
                    type="button"
                    class="employee-attendance-close"
                    id="closeEmployeeAttendanceBtn">

                    ✕

                </button>

            </div>


            <div class="employee-attendance-body">

                <div class="attendance-employee-info">

                    <div class="attendance-avatar">
                        👤
                    </div>

                    <div>

                        <h3>
                            ${escapeAttendanceHTML(
                                employee.name ||
                                employee.employeeName ||
                                "Employee"
                            )}
                        </h3>

                        <p>
                            ${
                                escapeAttendanceHTML(
                                    employee.position ||
                                    employee.role ||
                                    "Employee"
                                )
                            }
                        </p>

                    </div>

                </div>


                <div class="attendance-date">

                    <span>
                        📅 Date
                    </span>

                    <strong>
                        ${getAttendanceDate()}
                    </strong>

                </div>


                <div
                    class="attendance-status-card"
                    id="employeeAttendanceStatus">

                    ${getAttendanceStatusHTML(
                        todayAttendance
                    )}

                </div>


                <div
                    class="attendance-actions"
                    id="employeeAttendanceActions">

                    ${getAttendanceActionsHTML(
                        todayAttendance
                    )}

                </div>


                <div
                    class="attendance-message"
                    id="employeeAttendanceMessage">
                </div>

            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    bindAttendanceModalEvents();

}


// =========================================================
// ATTENDANCE STATUS HTML
// =========================================================

function getAttendanceStatusHTML(
    attendance
) {

    if (!attendance) {

        return `

            <div class="attendance-status-icon">
                🕘
            </div>

            <div>

                <span>
                    Today's Status
                </span>

                <strong>
                    Not Checked In
                </strong>

            </div>

        `;

    }


    if (
        attendance.checkIn &&
        !attendance.checkOut
    ) {

        return `

            <div class="attendance-status-icon">
                🟢
            </div>

            <div>

                <span>
                    Today's Status
                </span>

                <strong>
                    Checked In
                </strong>

                <small>
                    Check In:
                    ${escapeAttendanceHTML(
                        attendance.checkIn
                    )}
                </small>

            </div>

        `;

    }


    if (
        attendance.checkIn &&
        attendance.checkOut
    ) {

        return `

            <div class="attendance-status-icon">
                ✅
            </div>

            <div>

                <span>
                    Today's Status
                </span>

                <strong>
                    Attendance Completed
                </strong>

                <small>
                    ${escapeAttendanceHTML(
                        attendance.checkIn
                    )}
                    -
                    ${escapeAttendanceHTML(
                        attendance.checkOut
                    )}
                </small>

            </div>

        `;

    }


    return "";

}


// =========================================================
// ATTENDANCE ACTIONS HTML
// =========================================================

function getAttendanceActionsHTML(
    attendance
) {

    if (!attendance) {

        return `

            <button
                type="button"
                class="primary-btn"
                id="employeeCheckInBtn">

                🟢 Check In

            </button>

        `;

    }


    if (
        attendance.checkIn &&
        !attendance.checkOut
    ) {

        return `

            <button
                type="button"
                class="primary-btn"
                id="employeeCheckOutBtn">

                🔴 Check Out

            </button>

        `;

    }


    if (
        attendance.checkIn &&
        attendance.checkOut
    ) {

        return `

            <div class="attendance-completed-message">

                ✅ Today's attendance is complete.

            </div>

        `;

    }


    return "";

}


// =========================================================
// BIND ATTENDANCE MODAL EVENTS
// =========================================================

function bindAttendanceModalEvents() {

    const closeBtn =
        document.getElementById(
            "closeEmployeeAttendanceBtn"
        );


    if (closeBtn) {

        closeBtn.addEventListener(
            "click",
            closeEmployeeAttendance
        );

    }


    const checkInBtn =
        document.getElementById(
            "employeeCheckInBtn"
        );


    if (checkInBtn) {

        checkInBtn.addEventListener(
            "click",
            employeeCheckIn
        );

    }


    const checkOutBtn =
        document.getElementById(
            "employeeCheckOutBtn"
        );


    if (checkOutBtn) {

        checkOutBtn.addEventListener(
            "click",
            employeeCheckOut
        );

    }


    const modal =
        document.getElementById(
            "employeeAttendanceModal"
        );


    if (modal) {

        modal.addEventListener(
            "click",
            function(event) {

                if (
                    event.target ===
                    modal
                ) {

                    closeEmployeeAttendance();

                }

            }
        );

    }

}


// =========================================================
// EMPLOYEE CHECK IN
// =========================================================

function employeeCheckIn() {

    const employee =
        getCurrentEmployee();


    if (!employee) {

        showAttendanceMessage(
            "Employee not found.",
            "error"
        );

        return;

    }


    const records =
        getEmployeeAttendanceRecords();


    const today =
        getAttendanceDate();


    const existing =
        records.find(function(record) {

            return (
                String(record.employeeId) ===
                String(employee.id)
                &&
                record.date === today
            );

        });


    if (existing) {

        if (existing.checkIn) {

            showAttendanceMessage(
                "You have already checked in today.",
                "warning"
            );

        }

        return;

    }


    const now =
        new Date();


    const attendance = {

        id:
            generateAttendanceId(),

        employeeId:
            employee.id,

        employeeName:
            employee.name ||
            employee.employeeName ||
            "Employee",

        date:
            today,

        status:
            "Present",

        checkIn:
            formatAttendanceTime(now),

        checkInTimestamp:
            now.toISOString(),

        checkOut:
            "",

        checkOutTimestamp:
            "",

        workingHours:
            0,

        createdAt:
            now.toISOString(),

        updatedAt:
            now.toISOString()

    };


    records.push(
        attendance
    );


    saveEmployeeAttendanceRecords(
        records
    );


    refreshAttendanceModal(
        attendance
    );


    showAttendanceMessage(
        "Check In saved successfully.",
        "success"
    );


    updateEmployeeAttendanceDashboard();


    console.log(
        "Employee checked in:",
        attendance
    );

}


// =========================================================
// EMPLOYEE CHECK OUT
// =========================================================

function employeeCheckOut() {

    const employee =
        getCurrentEmployee();


    if (!employee) {

        showAttendanceMessage(
            "Employee not found.",
            "error"
        );

        return;

    }


    const records =
        getEmployeeAttendanceRecords();


    const today =
        getAttendanceDate();


    const index =
        records.findIndex(function(record) {

            return (
                String(record.employeeId) ===
                String(employee.id)
                &&
                record.date === today
            );

        });


    if (index === -1) {

        showAttendanceMessage(
            "Please Check In first.",
            "warning"
        );

        return;

    }


    if (
        records[index].checkOut
    ) {

        showAttendanceMessage(
            "You have already checked out today.",
            "warning"
        );

        return;

    }


    const now =
        new Date();


    const checkInTime =
        new Date(
            records[index]
                .checkInTimestamp
        );


    const difference =
        now.getTime() -
        checkInTime.getTime();


    const workingHours =
        Math.max(
            0,
            difference /
            (
                1000 *
                60 *
                60
            )
        );


    records[index].checkOut =
        formatAttendanceTime(now);


    records[index].checkOutTimestamp =
        now.toISOString();


    records[index].workingHours =
        Number(
            workingHours.toFixed(2)
        );


    records[index].status =
        "Present";


    records[index].updatedAt =
        now.toISOString();


    saveEmployeeAttendanceRecords(
        records
    );


    refreshAttendanceModal(
        records[index]
    );


    showAttendanceMessage(
        "Check Out saved successfully.",
        "success"
    );


    updateEmployeeAttendanceDashboard();


    console.log(
        "Employee checked out:",
        records[index]
    );

}


// =========================================================
// REFRESH ATTENDANCE MODAL
// =========================================================

function refreshAttendanceModal(
    attendance
) {

    const statusContainer =
        document.getElementById(
            "employeeAttendanceStatus"
        );


    const actionsContainer =
        document.getElementById(
            "employeeAttendanceActions"
        );


    if (statusContainer) {

        statusContainer.innerHTML =
            getAttendanceStatusHTML(
                attendance
            );

    }


    if (actionsContainer) {

        actionsContainer.innerHTML =
            getAttendanceActionsHTML(
                attendance
            );

    }


    bindAttendanceActionButtons();

}


// =========================================================
// BIND ACTION BUTTONS
// =========================================================

function bindAttendanceActionButtons() {

    const checkInBtn =
        document.getElementById(
            "employeeCheckInBtn"
        );


    if (checkInBtn) {

        checkInBtn.addEventListener(
            "click",
            employeeCheckIn
        );

    }


    const checkOutBtn =
        document.getElementById(
            "employeeCheckOutBtn"
        );


    if (checkOutBtn) {

        checkOutBtn.addEventListener(
            "click",
            employeeCheckOut
        );

    }

}


// =========================================================
// CLOSE ATTENDANCE
// =========================================================

function closeEmployeeAttendance() {

    const modal =
        document.getElementById(
            "employeeAttendanceModal"
        );


    if (modal) {

        modal.remove();

    }

}


// =========================================================
// ATTENDANCE MESSAGE
// =========================================================

function showAttendanceMessage(
    message,
    type = "success"
) {

    const messageBox =
        document.getElementById(
            "employeeAttendanceMessage"
        );


    if (!messageBox) {

        alert(message);

        return;

    }


    messageBox.className =
        "attendance-message " +
        type;


    messageBox.textContent =
        message;


    setTimeout(function() {

        if (messageBox) {

            messageBox.textContent =
                "";

            messageBox.className =
                "attendance-message";

        }

    }, 3000);

}


// =========================================================
// UPDATE EMPLOYEE DASHBOARD ATTENDANCE
// =========================================================

function updateEmployeeAttendanceDashboard() {

    /*
        Existing employee.js ke
        attendanceRecords variable ko disturb nahi kar rahe.

        Dashboard ke liye current attendance
        records se calculation kar rahe hain.
    */


    const records =
        getEmployeeAttendanceRecords();


    const today =
        getAttendanceDate();


    const todayRecords =
        records.filter(function(record) {

            return record.date === today;

        });


    const present =
        todayRecords.filter(function(record) {

            return record.status ===
                "Present";

        }).length;


    const attendanceRate =
        todayRecords.length > 0
            ? Math.round(
                (
                    present /
                    todayRecords.length
                ) * 100
            )
            : 0;


    const attendanceElement =
        document.getElementById(
            "attendanceRate"
        );


    if (attendanceElement) {

        attendanceElement.innerText =
            attendanceRate + "%";

    }


    const statusElement =
        document.getElementById(
            "attendanceStatus"
        );


    if (statusElement) {

        if (attendanceRate >= 90) {

            statusElement.innerText =
                "Excellent Attendance";

        }
        else if (attendanceRate >= 75) {

            statusElement.innerText =
                "Good Attendance";

        }
        else if (attendanceRate > 0) {

            statusElement.innerText =
                "Attendance Needs Attention";

        }
        else {

            statusElement.innerText =
                "No Attendance Recorded";

        }

    }

}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeAttendanceHTML(
    value
) {

    return String(
        value || ""
    )
    .replace(
        /&/g,
        "&amp;"
    )
    .replace(
        /</g,
        "&lt;"
    )
    .replace(
        />/g,
        "&gt;"
    )
    .replace(
        /"/g,
        "&quot;"
    )
    .replace(
        /'/g,
        "&#039;"
    );

}


// =========================================================
// EXPOSE FUNCTIONS
// =========================================================

window.openEmployeeAttendance =
    openEmployeeAttendance;

window.closeEmployeeAttendance =
    closeEmployeeAttendance;

window.employeeCheckIn =
    employeeCheckIn;

window.employeeCheckOut =
    employeeCheckOut;

window.getEmployeeAttendanceRecords =
    getEmployeeAttendanceRecords;

window.updateEmployeeAttendanceDashboard =
    updateEmployeeAttendanceDashboard;


console.log(
    "Synvora AI - Employee Attendance System Ready"
);