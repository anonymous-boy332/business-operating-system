/* ==================================
   BUSINESS OS - EMPLOYEES JS
   FINAL VERSION
================================== */

console.log("Employees JS Loaded");


// ==================================
// GLOBAL VARIABLES
// ==================================

let editEmployeeIndex = null;
let attendanceEmployeeIndex = null;
let selectedEmployeeIndex = null;
let editingAttendanceId = null;
let employeePhotoData = "";
let showAllAttendanceRecords = false;

let exportEmployees = null;
let exportEmployeesPdf = null;

// ==================================
// EMPLOYEES DATA
// ==================================

function isUneditedSampleEmployee(employee) {
    const sampleProfiles = {
        "Ali Ahmed": { department: "Design", task: "Website UI", performance: "98%" },
        "Sarah Khan": { department: "Marketing", task: "Campaign", performance: "95%" }
    };
    const sample = sampleProfiles[employee.name];

    return Boolean(
        sample &&
        employee.department === sample.department &&
        employee.task === sample.task &&
        employee.performance === sample.performance &&
        employee.status === "Active" &&
        /^EMP-\d+-[a-z0-9]{6}$/i.test(employee.id || "") &&
        !employee.email &&
        !employee.phone &&
        !employee.address &&
        !employee.salary &&
        !employee.photo
    );
}

let employees = (JSON.parse(
    localStorage.getItem("employees") || "[]"
) || []).filter(employee => !isUneditedSampleEmployee(employee));

// ==================================
// ENSURE EMPLOYEE IDS & PERMISSIONS
// ==================================

employees.forEach(employee => {

    if(!employee.id){

        employee.id =
            "EMP-" +
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .substring(2, 8);

    }

    if(!employee.role){

        employee.role =
            "Employee";

    }

    if(!Array.isArray(employee.permissions)){

        employee.permissions =
            [];

    }

});

localStorage.setItem(
    "employees",
    JSON.stringify(employees)
);
window.refreshBusinessIntelligence?.();


// ==================================
// ATTENDANCE DATA
// ==================================

let attendanceRecords = JSON.parse(
    localStorage.getItem("employeeAttendance") ||
    localStorage.getItem("attendanceRecords")
) || [];


// ==================================
// SAVE EMPLOYEES
// ==================================

function saveEmployees(){

    localStorage.setItem(
        "employees",
        JSON.stringify(employees)
    );

}

function setEmployeeMetric(id, value){

    document.querySelectorAll(`[id="${id}"]`)
        .forEach(element => {
            element.textContent = value;
        });

}

function updatePeopleAccessOverview(){

    const activeEmployees =
        employees.filter(employee =>
            employee.status === "Active"
        ).length;

    const departments = new Set(
        employees
            .map(employee => (employee.department || "").trim())
            .filter(Boolean)
    );

    const performanceValues = employees
        .map(employee =>
            parseFloat(
                String(employee.performance || "")
                    .replace(/[^0-9.]/g, "")
            )
        )
        .filter(value => Number.isFinite(value));

    const averagePerformance = performanceValues.length
        ? Math.round(
            performanceValues.reduce((total, value) => total + value, 0) /
            performanceValues.length
        )
        : 0;

    const activeRate = employees.length
        ? Math.round((activeEmployees / employees.length) * 100)
        : 0;

    setEmployeeMetric("peopleAccessDepartmentCount", departments.size);
    setEmployeeMetric(
        "peopleAccessPerformance",
        `${averagePerformance}%`
    );
    setEmployeeMetric("peopleAccessActiveRate", `${activeRate}%`);
    setEmployeeMetric(
        "peopleAccessActiveSummary",
        employees.length
            ? `${activeEmployees} of ${employees.length} team members active`
            : "Add employees to build your workforce overview."
    );

    const progress = document.getElementById(
        "peopleAccessActiveProgress"
    );

    if(progress){
        progress.style.width = `${activeRate}%`;
        progress.parentElement.setAttribute(
            "aria-valuenow",
            String(activeRate)
        );
    }

}


// ==================================
// SAVE ATTENDANCE RECORDS
// ==================================
function saveAttendanceRecords(){

    localStorage.setItem(
        "employeeAttendance",
        JSON.stringify(attendanceRecords)
    );

}



// ==================================
// LOAD ATTENDANCE RECORDS
// ==================================

function loadAttendanceRecords(){

    try{

        const data =
            localStorage.getItem(
                "synvoraEmployeeAttendance"
            );

        if(!data){

            attendanceRecords = [];

            return;

        }

        const records =
            JSON.parse(data);

        attendanceRecords =
            Array.isArray(records)
                ? records
                : [];

    }
    catch(error){

        console.error(
            "Attendance records load error:",
            error
        );

        attendanceRecords = [];

    }

}


// ==================================
// EMPLOYEE TASK STATUS
// ==================================

function getEmployeeTaskStatus(task){

    const value =
        (task || "")
        .trim()
        .toLowerCase();


    if(value === ""){

        return {
            label: "Pending",
            className: "pending"
        };

    }


    if(
        value.includes("complete") ||
        value.includes("completed") ||
        value.includes("done") ||
        value.includes("finish") ||
        value.includes("finished")
    ){

        return {
            label: "Completed",
            className: "completed"
        };

    }


    return {
        label: "In Progress",
        className: "progress"
    };

}


// ==================================
// LOAD EMPLOYEE TABLE
// ==================================

function loadEmployees(){

    const table =
        document.getElementById("employeeList");

    if(!table){
        return;
    }


    table.innerHTML = "";


    const search =
        document.getElementById("searchEmployee")
        ?.value
        .toLowerCase()
        .trim() || "";


    const department =
        document.getElementById("departmentFilter")
        ?.value || "all";


    const status =
        document.getElementById("statusFilterEmployee")
        ?.value || "all";


    const filteredEmployees =
        employees.filter(employee => {

            const employeeName =
                (employee.name || "")
                .toLowerCase();


            const matchSearch =
                employeeName.includes(search);


            const matchDepartment =
                department === "all" ||
                employee.department === department;


            const matchStatus =
                status === "all" ||
                employee.status === status;


            return (
                matchSearch &&
                matchDepartment &&
                matchStatus
            );

        });


    const isFiltering =
        search !== "" ||
        department !== "all" ||
        status !== "all";


    const displayEmployees =
        isFiltering
        ? filteredEmployees
        : filteredEmployees.slice(-5);


    if(displayEmployees.length === 0){

        table.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    style="
                        text-align:center;
                        padding:30px;
                    "
                >

                    👥 No employees found.

                </td>

            </tr>

        `;

        updateEmployeeSummary();
        updateEmployeeDashboard();

        return;
    }


    displayEmployees.forEach(employee => {

        const index =
            employees.indexOf(employee);


        const performance =
            Math.min(
                100,
                Math.max(
                    0,
                    parseInt(employee.performance) || 0
                )
            );


        table.innerHTML += `

            <tr>

                <td>

                    <div class="employee-info">

                        <img
                            class="employee-table-avatar"
                            src="${employee.photo || 'https://via.placeholder.com/45'}"
                            alt="${employee.name || 'Employee'}"
                        >

                        <div>

                            <h4>
                                ${employee.name || "-"}
                            </h4>

                            <small>
                                ${employee.email || "No Email"}
                            </small>

                        </div>

                    </div>

                </td>


                <td>
                    ${employee.department || "-"}
                </td>


                <td>

                    <span
                        class="status-badge ${(
                            employee.status || ""
                        ).toLowerCase()}"
                    >

                        ${employee.status || "-"}

                    </span>

                </td>


                <td>
                    ${employee.task || "No Task"}
                </td>


                <td>

                    <div class="performance-box">

                        <div class="performance-bar">

                            <div
                                class="performance-fill"
                                style="width:${performance}%"
                            ></div>

                        </div>

                        <span>
                            ${employee.performance || "0%"}
                        </span>

                    </div>

                </td>


                <td>

                    <div class="employee-actions">

                        <button
    class="action-view"
    onclick="viewEmployee(${index})">

    👁 View

</button>


<button
    class="action-edit"
    onclick="editEmployee(${index})">

    ✏️ Edit

</button>


<button
    class="action-attendance"
    onclick="openAttendanceModal(${index})">

    🟢 Attendance

</button>


<button
    class="action-delete"
    onclick="deleteEmployee(${index})">

    🗑 Delete

</button>

                    </div>

                </td>

            </tr>

        `;

    });


    updateEmployeeSummary();
    updateEmployeeDashboard();

}


// ==================================
// ADD EMPLOYEE
// ==================================

function addEmployee(){

    editEmployeeIndex = null;

    const fields = [

        "employeeName",
        "employeeDepartment",
        "employeeTask",
        "employeePerformance",
        "employeeEmail",
        "employeePhone",
        "employeeAddress",
        "employeeSalary",
        "employeeJoinDate",
        "employeeDOB"

    ];


    fields.forEach(id => {

        const element =
            document.getElementById(id);

        if(element){
            element.value = "";
        }

    });


    const status =
        document.getElementById("employeeStatus");

    if(status){
        status.value = "Active";
    }


    employeePhotoData = "";


    const preview =
        document.getElementById("employeePreview");

    if(preview){

        preview.src =
            "https://via.placeholder.com/120";

    }


    const photo =
        document.getElementById("employeePhoto");

    if(photo){
        photo.value = "";
    }


    const modal =
        document.getElementById("employeeModal");

    if(modal){
        modal.style.display = "flex";
    }

}


// ==================================
// CLOSE EMPLOYEE MODAL
// ==================================

function closeEmployeeModal(){

    const modal =
        document.getElementById("employeeModal");

    if(modal){
        modal.style.display = "none";
    }


    employeePhotoData = "";


    const photo =
        document.getElementById("employeePhoto");

    if(photo){
        photo.value = "";
    }


    const preview =
        document.getElementById("employeePreview");

    if(preview){

        preview.src =
            "https://via.placeholder.com/120";

    }

}


// ==================================
// SAVE EMPLOYEE
// ==================================

function saveEmployee(){

    const getValue = id =>
        document.getElementById(id)?.value?.trim() || "";


    const name =
        getValue("employeeName");


    const department =
        getValue("employeeDepartment");


    const task =
        getValue("employeeTask");


    let performance =
        getValue("employeePerformance");


    const status =
        document.getElementById(
            "employeeStatus"
        )?.value || "Active";


    const email =
        getValue("employeeEmail");


    const phone =
        getValue("employeePhone");


    const address =
        getValue("employeeAddress");


    const salary =
        getValue("employeeSalary");


    const joinDate =
        getValue("employeeJoinDate");


    const dob =
        getValue("employeeDOB");


    if(
        name === "" ||
        department === ""
    ){

        alert(
            "Please enter employee name and department"
        );

        return;

    }


    if(performance === ""){

        performance = "0";

    }


    performance =
        Math.min(
            100,
            Math.max(
                0,
                parseInt(performance) || 0
            )
        );


    const existingEmployee =
    editEmployeeIndex !== null
        ? employees[editEmployeeIndex]
        : null;


const employee = {

    id:
        existingEmployee?.id ||
        "EMP-" + Date.now(),

    name: name,

    department: department,

    task: task,

    performance:
        performance + "%",

    status: status,

    email: email,

    phone: phone,

    address: address,

    salary: salary,

    joinDate: joinDate,

    dob: dob,

    photo: employeePhotoData,

    /*
        TEAM PERMISSIONS DATA
        Preserve existing role and permissions
        when editing an employee.
    */

    role:
        existingEmployee?.role ||
        "Employee",

    permissions:
        existingEmployee?.permissions ||
        []

};


    if(editEmployeeIndex !== null){

        employees[editEmployeeIndex] =
            employee;

        editEmployeeIndex = null;

    }

    else{

        employees.push(employee);

    }


    saveEmployees();

    loadEmployees();

    loadEmployeeManagement();

    loadEmployeeTasks();

    loadAttendanceEmployees();

    updateEmployeeSummary();

    updateEmployeeDashboard();

    closeEmployeeModal();

}


// ==================================
// EDIT EMPLOYEE
// ==================================

function editEmployee(index){

    const employee =
        employees[index];

    if(!employee){
        return;
    }


    editEmployeeIndex =
        index;


    const setValue = (
        id,
        value = ""
    ) => {

        const element =
            document.getElementById(id);

        if(element){

            element.value =
                value;

        }

    };


    setValue(
        "employeeName",
        employee.name
    );


    setValue(
        "employeeDepartment",
        employee.department
    );


    setValue(
        "employeeTask",
        employee.task
    );


    setValue(
        "employeePerformance",
        (employee.performance || "")
            .replace("%", "")
    );


    setValue(
        "employeeStatus",
        employee.status || "Active"
    );


    setValue(
        "employeeEmail",
        employee.email
    );


    setValue(
        "employeePhone",
        employee.phone
    );


    setValue(
        "employeeAddress",
        employee.address
    );


    setValue(
        "employeeSalary",
        employee.salary
    );


    setValue(
        "employeeJoinDate",
        employee.joinDate
    );


    setValue(
        "employeeDOB",
        employee.dob
    );


    employeePhotoData =
        employee.photo || "";


    const preview =
        document.getElementById(
            "employeePreview"
        );


    if(preview){

        preview.src =
            employee.photo ||
            "https://via.placeholder.com/120";

    }


    const modal =
        document.getElementById(
            "employeeModal"
        );


    if(modal){

        modal.style.display =
            "flex";

    }

}


// ==================================
// DELETE EMPLOYEE
// ==================================

function deleteEmployee(index){

    const employee =
        employees[index];

    if(!employee){
        return;
    }


    if(!confirm(
        `Delete ${employee.name}?`
    )){

        return;

    }


    employees.splice(
        index,
        1
    );


    /*
       Remove attendance records
       belonging to deleted employee.
    */

    attendanceRecords =
        attendanceRecords.filter(
            record =>
                Number(record.employeeIndex) !==
                Number(index)
        );


    /*
       Fix remaining employee indexes
       after deletion.
    */

    attendanceRecords.forEach(record => {

        if(
            Number(record.employeeIndex) >
            Number(index)
        ){

            record.employeeIndex =
                Number(record.employeeIndex) - 1;

        }

    });


    saveEmployees();

    saveAttendanceRecords();


    loadEmployees();

    loadEmployeeManagement();

    loadEmployeeTasks();

    loadAttendanceEmployees();

    loadAttendanceHistory();

    updateAttendanceSummary();

    updateEmployeeSummary();

    updateEmployeeDashboard();

}


// ==================================
// VIEW EMPLOYEE
// ==================================

function viewEmployee(index){

    const employee =
        employees[index];

    if(!employee){
        return;
    }


    const profile =
        document.getElementById(
            "employeeProfile"
        );


    if(!profile){
        return;
    }


    profile.innerHTML = `

        <div class="employee-profile-card">

            <div class="employee-avatar">

                ${
                    employee.photo

                    ?

                    `<img
                        src="${employee.photo}"
                        alt="${employee.name || "Employee"}"
                    >`

                    :

                    `👨‍💼`
                }

            </div>


            <h2>
                ${employee.name || "-"}
            </h2>


            <div class="profile-grid">

                <div class="profile-item">
                    <p>
                        <strong>Department:</strong>
                        ${employee.department || "-"}
                    </p>
                </div>


                <div class="profile-item">
                    <p>
                        <strong>Status:</strong>
                        ${employee.status || "-"}
                    </p>
                </div>


                <div class="profile-item">
                    <p>
                        <strong>Current Task:</strong>
                        ${employee.task || "-"}
                    </p>
                </div>


                <div class="profile-item">
                    <p>
                        <strong>Performance:</strong>
                        ${employee.performance || "0%"}
                    </p>
                </div>


                <div class="profile-item">
                    <p>
                        <strong>Email:</strong>
                        ${employee.email || "-"}
                    </p>
                </div>


                <div class="profile-item">
                    <p>
                        <strong>Phone:</strong>
                        ${employee.phone || "-"}
                    </p>
                </div>


                <div class="profile-item">
                    <p>
                        <strong>Address:</strong>
                        ${employee.address || "-"}
                    </p>
                </div>


                <div class="profile-item">
                    <p>
                        <strong>Salary:</strong>
                        $${employee.salary || "0"}
                    </p>
                </div>


                <div class="profile-item">
                    <p>
                        <strong>Join Date:</strong>
                        ${employee.joinDate || "-"}
                    </p>
                </div>


                <div class="profile-item">
                    <p>
                        <strong>Date of Birth:</strong>
                        ${employee.dob || "-"}
                    </p>
                </div>

<div class="profile-item">

    <p>
        <strong>Role:</strong>
        ${employee.role || "Employee"}
    </p>

</div>


<div class="profile-item profile-permissions-item">

    <p>
        <strong>Permissions:</strong>
    </p>

    <div class="employee-profile-permissions">

        ${
            Array.isArray(employee.permissions) &&
            employee.permissions.length > 0

            ?

            employee.permissions.map(permission => `

                <span class="profile-permission-badge">
                    ✓ ${permission}
                </span>

            `).join("")

            :

            `<span class="profile-no-permissions">
                No permissions assigned
            </span>`
        }

    </div>

</div>

            </div>

        </div>

    `;


    const modal =
        document.getElementById(
            "viewEmployeeModal"
        );


    if(modal){

        modal.style.display =
            "flex";

    }

}


// ==================================
// CLOSE VIEW MODAL
// ==================================

function closeViewEmployeeModal(){

    const modal =
        document.getElementById(
            "viewEmployeeModal"
        );


    if(modal){

        modal.style.display =
            "none";

    }

}


// ==================================
// EXPORT CSV
// ==================================

function exportEmployeesCSV(){

    const escapeCSV = value => {

        const stringValue =
            String(value ?? "");

        return `"${stringValue
            .replace(/"/g, '""')}"`;

    };


    let csv =
        "Name,Department,Status,Task,Performance,Email,Phone,Address,Salary,Join Date,Date of Birth\n";


    employees.forEach(employee => {

        csv += [

            employee.name,

            employee.department,

            employee.status,

            employee.task,

            employee.performance,

            employee.email,

            employee.phone,

            employee.address,

            employee.salary,

            employee.joinDate,

            employee.dob

        ]
        .map(escapeCSV)
        .join(",") + "\n";

    });


    const blob =
        new Blob(
            [csv],
            {
                type: "text/csv;charset=utf-8;"
            }
        );


    const link =
        document.createElement("a");


    link.href =
        URL.createObjectURL(blob);


    link.download =
        "employees.csv";


    link.click();


    URL.revokeObjectURL(
        link.href
    );

}


// ==================================
// EXPORT PDF
// ==================================

function exportEmployeesToPDF(){

    if(
        !window.jspdf ||
        !window.jspdf.jsPDF
    ){

        alert(
            "PDF library is not loaded."
        );

        return;

    }


    const { jsPDF } =
        window.jspdf;


    const doc =
        new jsPDF();


    doc.setFontSize(20);

    doc.text(
        "Synvora AI",
        14,
        18
    );


    doc.setFontSize(14);

    doc.text(
        "Employee Report",
        14,
        28
    );


    doc.setFontSize(10);

    doc.text(
        "Generated: " +
        new Date().toLocaleString(),
        14,
        36
    );


    const rows =
        employees.map(employee => [

            employee.name || "-",

            employee.department || "-",

            employee.status || "-",

            employee.task || "-",

            employee.performance || "0%",

            employee.email || "-",

            employee.phone || "-",

            employee.salary || "0"

        ]);


    if(typeof doc.autoTable !== "function"){

        alert(
            "PDF table library is not loaded."
        );

        return;

    }


    doc.autoTable({

        head: [[

            "Name",
            "Department",
            "Status",
            "Task",
            "Performance",
            "Email",
            "Phone",
            "Salary"

        ]],

        body: rows,

        startY: 45,

        styles: {
            fontSize: 8
        },

        headStyles: {
            fontSize: 8
        }

    });


    doc.save(
        "Synvora-Employees.pdf"
    );

}


// ==================================
// EMPLOYEE SUMMARY
// ==================================

function updateEmployeeSummary(){

    const total =
        employees.length;


    let active = 0;
    let leave = 0;
    let inactive = 0;


    employees.forEach(employee => {

        if(employee.status === "Active"){

            active++;

        }

        else if(employee.status === "Leave"){

            leave++;

        }

        else if(employee.status === "Inactive"){

            inactive++;

        }

    });


    setEmployeeMetric("totalEmployees", total);
    setEmployeeMetric("activeEmployees", active);
    setEmployeeMetric("leaveEmployees", leave);
    setEmployeeMetric("inactiveEmployees", inactive);
    setEmployeeMetric("managementTotalEmployees", total);
    setEmployeeMetric("managementActiveEmployees", active);
    setEmployeeMetric("managementLeaveEmployees", leave);
    setEmployeeMetric("managementInactiveEmployees", inactive);
    updatePeopleAccessOverview();

}


// ==================================
// EMPLOYEE PHOTO PREVIEW
// ==================================

function initializeEmployeePhoto(){

    const employeePhoto =
        document.getElementById(
            "employeePhoto"
        );


    const employeePreview =
        document.getElementById(
            "employeePreview"
        );


    if(
        !employeePhoto ||
        !employeePreview
    ){

        return;

    }


    employeePhoto.addEventListener(
        "change",
        function(){

            const file =
                this.files[0];


            if(!file){
                return;
            }


            const reader =
                new FileReader();


            reader.onload =
                function(event){

                    employeePhotoData =
                        event.target.result;


                    employeePreview.src =
                        employeePhotoData;

                };


            reader.readAsDataURL(file);

        }
    );

}


// ==================================
// ATTENDANCE EMPLOYEE FILTER
// ==================================

function loadAttendanceEmployees(){

    const filter =
        document.getElementById(
            "attendanceEmployeeFilter"
        );


    if(!filter){
        return;
    }


    filter.innerHTML = `

        <option value="all">
            All Employees
        </option>

    `;


    employees.forEach(
        (employee, index) => {

            filter.innerHTML += `

                <option value="${index}">
                    ${employee.name || "Employee"}
                </option>

            `;

        }
    );

}


// ==================================
// OPEN ATTENDANCE MODAL
// ==================================

function openAttendanceModal(index){

    const employee =
        employees[index];


    if(!employee){
        return;
    }


    attendanceEmployeeIndex =
        index;


    editingAttendanceId =
        null;


    const employeeName =
        document.getElementById(
            "attendanceEmployeeName"
        );


    if(employeeName){

        employeeName.innerText =
            employee.name;

    }


    const date =
        document.getElementById(
            "attendanceDate"
        );


    if(date){

        date.value =
            new Date()
            .toISOString()
            .split("T")[0];

    }


    const status =
        document.getElementById(
            "attendanceStatus"
        );


    if(status){

        status.value =
            "Present";

    }


    const checkIn =
        document.getElementById(
            "attendanceCheckIn"
        );


    if(checkIn){

        checkIn.value =
            "";

    }


    const checkOut =
        document.getElementById(
            "attendanceCheckOut"
        );


    if(checkOut){

        checkOut.value =
            "";

    }


    const notes =
        document.getElementById(
            "attendanceNotes"
        );


    if(notes){

        notes.value =
            "";

    }


    const modal =
        document.getElementById(
            "attendanceModal"
        );


    if(modal){

        modal.style.display =
            "flex";

    }

}

// ==================================
// CALCULATE WORKING HOURS
// ==================================
function calculateWorkingHours(checkIn, checkOut) {

    if (!checkIn || !checkOut) {
        return "";
    }

    const start = new Date(`1970-01-01T${checkIn}`);
    const end = new Date(`1970-01-01T${checkOut}`);

    if (end < start) {
        end.setDate(end.getDate() + 1);
    }

    const difference =
        end.getTime() - start.getTime();

    const totalMinutes =
        Math.floor(difference / 60000);

    const hours =
        Math.floor(totalMinutes / 60);

    const minutes =
        totalMinutes % 60;

    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

// ==================================
// CLOSE ATTENDANCE MODAL
// ==================================

function closeAttendanceModal(){

    const modal =
        document.getElementById(
            "attendanceModal"
        );


    if(modal){

        modal.style.display =
            "none";

    }


    attendanceEmployeeIndex =
        null;


    editingAttendanceId =
        null;

}


// ==================================
// SAVE ATTENDANCE
// ==================================

function saveAttendance(){

    if(attendanceEmployeeIndex === null){

        alert(
            "Please select an employee."
        );

        return;

    }


    const employee =
        employees[
            attendanceEmployeeIndex
        ];


    if(!employee){

        alert(
            "Employee not found."
        );

        return;

    }


    const date =
        document.getElementById(
            "attendanceDate"
        )?.value || "";


    const status =
        document.getElementById(
            "attendanceStatus"
        )?.value || "Present";


    const checkIn =
        document.getElementById(
            "attendanceCheckIn"
        )?.value || "";


    const checkOut =
        document.getElementById(
            "attendanceCheckOut"
        )?.value || "";

        const workingHours =
    calculateWorkingHours(
        checkIn,
        checkOut
    );


    const notes =
        document.getElementById(
            "attendanceNotes"
        )?.value || "";


    if(date === ""){

        alert(
            "Please select attendance date."
        );

        return;

    }


    if(
        editingAttendanceId !== null
    ){

        const record =
            attendanceRecords.find(
                item =>
                    Number(item.id) ===
                    Number(editingAttendanceId)
            );


        if(record){

            record.employeeName =
                employee.name;

            record.employeeIndex =
                attendanceEmployeeIndex;

            record.date =
                date;

            record.status =
                status;

            record.checkOut =
    checkOut;

record.workingHours =
    workingHours;

record.notes =
    notes;

        }

    }

    else{

        const alreadyExists =
            attendanceRecords.some(
                record =>

                    Number(
                        record.employeeIndex
                    ) ===
                    Number(
                        attendanceEmployeeIndex
                    )

                    &&

                    record.date === date
            );


        if(alreadyExists){

            alert(
                `${employee.name} already has attendance for ${date}.`
            );

            return;

        }


        attendanceRecords.push({

            id: Date.now(),

            employeeName:
                employee.name,

            employeeIndex:
                attendanceEmployeeIndex,

            date:
                date,

            status:
                status,

            checkIn:
                checkIn,

            checkOut:
    checkOut,

workingHours:
    workingHours,

notes:
    notes

        });

    }


    saveAttendanceRecords();


    loadAttendanceHistory();

    updateAttendanceSummary();

    updateEmployeeDashboard();


    if(
        editingAttendanceId !== null
    ){

        alert(
            "Attendance Updated Successfully!"
        );

    }

    else{

        alert(
            "Attendance Saved Successfully!"
        );

    }


    closeAttendanceModal();

}


// ==================================
// EDIT ATTENDANCE
// ==================================

function editAttendance(id){

    const record =
        attendanceRecords.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    if(!record){

        alert(
            "Attendance record not found."
        );

        return;

    }


    attendanceEmployeeIndex =
        Number(record.employeeIndex);


    editingAttendanceId =
        Number(record.id);


    const employeeName =
        document.getElementById(
            "attendanceEmployeeName"
        );


    if(employeeName){

        employeeName.innerText =
            record.employeeName;

    }


    const setValue = (
        id,
        value
    ) => {

        const element =
            document.getElementById(id);

        if(element){

            element.value =
                value || "";

        }

    };


    setValue(
        "attendanceDate",
        record.date
    );


    setValue(
        "attendanceStatus",
        record.status
    );


    setValue(
        "attendanceCheckIn",
        record.checkIn
    );


    setValue(
        "attendanceCheckOut",
        record.checkOut
    );


    setValue(
        "attendanceNotes",
        record.notes
    );


    const modal =
        document.getElementById(
            "attendanceModal"
        );


    if(modal){

        modal.style.display =
            "flex";

    }

}


// ==================================
// DELETE ATTENDANCE
// ==================================

function deleteAttendance(id){

    const record =
        attendanceRecords.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    if(!record){

        alert(
            "Attendance record not found."
        );

        return;

    }


    if(!confirm(
        `Delete attendance for ${record.employeeName} on ${record.date}?`
    )){

        return;

    }


    attendanceRecords =
        attendanceRecords.filter(
            item =>
                Number(item.id) !==
                Number(id)
        );


    saveAttendanceRecords();


    loadAttendanceHistory();

    updateAttendanceSummary();

    updateEmployeeDashboard();


    alert(
        "Attendance Deleted Successfully!"
    );

}


// ==================================
// LOAD ATTENDANCE HISTORY
// ==================================

function renderEmployeeAttendanceHistory(){

    const tableBody =
        document.getElementById("attendanceHistoryList");

    if(!tableBody){
        return;
    }

    const search =
        document.getElementById("attendanceSearch")
            ?.value.toLowerCase().trim() || "";

    const date =
        document.getElementById("attendanceDateFilter")
            ?.value || "";

    const status =
        document.getElementById("attendanceStatusFilter")
            ?.value || "all";

    const employeeFilter =
        document.getElementById("attendanceEmployeeFilter");

    if(
        employeeFilter &&
        employeeFilter.options.length !== employees.length + 1
    ){
        loadAttendanceEmployees();
    }

    const selectedEmployee =
        employeeFilter?.value || "all";

    const filteredRecords =
        attendanceRecords
            .filter(record => {

                const employeeName =
                    (record.employeeName || "").toLowerCase();

                return (
                    (!search || employeeName.includes(search)) &&
                    (!date || record.date === date) &&
                    (status === "all" || record.status === status) &&
                    (
                        selectedEmployee === "all" ||
                        Number(record.employeeIndex) ===
                            Number(selectedEmployee)
                    )
                );

            })
            .sort((first, second) =>
                String(second.date || "").localeCompare(
                    String(first.date || "")
                ) ||
                Number(second.id || 0) - Number(first.id || 0)
            );

    const hasFilters =
        Boolean(
            search ||
            date ||
            status !== "all" ||
            selectedEmployee !== "all"
        );

    const recordsToShow =
        showAllAttendanceRecords || hasFilters
            ? filteredRecords
            : filteredRecords.slice(0, 5);

    tableBody.innerHTML = "";

    if(!recordsToShow.length){

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 7;
        cell.textContent = "No attendance records found.";
        cell.style.textAlign = "center";
        cell.style.padding = "24px";

        row.appendChild(cell);
        tableBody.appendChild(row);

        return;
    }

    recordsToShow.forEach(record => {

        const row = document.createElement("tr");
        const values = [
            record.employeeName || "Unknown Employee",
            record.date || "-",
            record.status || "-",
            record.checkIn || "-",
            record.checkOut || "-",
            record.notes || "-"
        ];

        values.forEach(value => {

            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);

        });

        const actionsCell = document.createElement("td");
        const editButton = document.createElement("button");
        const deleteButton = document.createElement("button");

        editButton.type = "button";
        editButton.className = "action-edit";
        editButton.dataset.attendanceEdit = record.id;
        editButton.textContent = "Edit";

        deleteButton.type = "button";
        deleteButton.className = "action-delete";
        deleteButton.dataset.attendanceDelete = record.id;
        deleteButton.textContent = "Delete";

        actionsCell.append(editButton, deleteButton);
        row.appendChild(actionsCell);
        tableBody.appendChild(row);

    });

}

function showFullAttendance(){

    showAllAttendanceRecords = true;
    renderEmployeeAttendanceHistory();

    document.querySelector(".attendance-history")
        ?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

}

function loadAttendanceHistory(){

    renderEmployeeAttendanceHistory();

    const tableBody = document.getElementById("attendanceHistoryTableBody");
    const emptyState = document.getElementById("attendanceHistoryEmpty");

    const searchInput = document.getElementById("attendanceHistorySearch");
    const dateInput = document.getElementById("attendanceHistoryDate");
    const statusInput = document.getElementById("attendanceHistoryStatus");

    const totalEl = document.getElementById("attendanceHistoryTotal");
    const presentEl = document.getElementById("attendanceHistoryPresent");
    const checkedInEl = document.getElementById("attendanceHistoryCheckedIn");
    const completedEl = document.getElementById("attendanceHistoryCompleted");

    if(!tableBody){
        return;
    }

    // Get attendance records
    const attendanceRecords =
        JSON.parse(localStorage.getItem("employeeAttendance")) || [];

    const searchValue =
        searchInput ? searchInput.value.toLowerCase().trim() : "";

    const dateValue =
        dateInput ? dateInput.value : "";

    const statusValue =
        statusInput ? statusInput.value : "";

    // Filter records
    const filteredRecords = attendanceRecords.filter(record => {

        const employeeName =
            (record.employeeName || record.name || "").toLowerCase();

        const recordDate =
            record.date || "";

        const recordStatus =
            record.status || "";

        const matchesSearch =
            !searchValue ||
            employeeName.includes(searchValue);

        const matchesDate =
            !dateValue ||
            recordDate === dateValue;

        const matchesStatus =
            !statusValue ||
            recordStatus === statusValue;

        return (
            matchesSearch &&
            matchesDate &&
            matchesStatus
        );
    });

    // Clear table
    tableBody.innerHTML = "";

    // Summary
    if(totalEl){
        totalEl.textContent = filteredRecords.length;
    }

    if(presentEl){
        presentEl.textContent =
            filteredRecords.filter(
                record => record.status === "Present"
            ).length;
    }

    if(checkedInEl){
        checkedInEl.textContent =
            filteredRecords.filter(record =>
                record.checkIn &&
                !record.checkOut
            ).length;
    }

    if(completedEl){
        completedEl.textContent =
            filteredRecords.filter(record =>
                record.checkIn &&
                record.checkOut
            ).length;
    }

    // Empty state
    if(filteredRecords.length === 0){

        tableBody.style.display = "none";

        if(emptyState){
            emptyState.style.display = "block";
        }

        return;
    }

    tableBody.style.display = "";

    if(emptyState){
        emptyState.style.display = "none";
    }

    // Create rows
    filteredRecords.forEach(record => {

        const employeeName =
            record.employeeName ||
            record.name ||
            "Unknown Employee";

        const department =
            record.department ||
            "Employee";

        const date =
            record.date || "-";

        const checkIn =
            record.checkIn || "-";

        const checkOut =
            record.checkOut || "-";

        let workingHours = "-";

        // Calculate working hours
        if(record.checkIn && record.checkOut){

            const checkInTime =
                new Date(`${date}T${record.checkIn}`);

            const checkOutTime =
                new Date(`${date}T${record.checkOut}`);

            const difference =
                checkOutTime - checkInTime;

            if(!isNaN(difference) && difference >= 0){

                const totalMinutes =
                    Math.floor(difference / 60000);

                const hours =
                    Math.floor(totalMinutes / 60);

                const minutes =
                    totalMinutes % 60;

                workingHours =
                    `${hours}h ${minutes}m`;
            }
        }

        let status =
            record.status || "Present";

        // If checked in but not checked out
        if(
            record.checkIn &&
            !record.checkOut &&
            status === "Present"
        ){
            status = "Checked In";
        }

        let statusClass =
            status.toLowerCase().replace(/\s+/g, "-");

        const row =
            document.createElement("tr");

        row.innerHTML = `

            <td>

                <div class="attendance-history-employee">

                    <div class="attendance-history-avatar">
                        👤
                    </div>

                    <div>

                        <strong>
                            ${employeeName}
                        </strong>

                        <small>
                            ${department}
                        </small>

                    </div>

                </div>

            </td>

            <td>
                ${date}
            </td>

            <td>

                ${
                    checkIn !== "-"
                    ?
                    `<span class="attendance-history-time check-in">
                        🟢 ${checkIn}
                    </span>`
                    :
                    `<span class="attendance-history-not-checked-out">
                        -
                    </span>`
                }

            </td>

            <td>

                ${
                    checkOut !== "-"
                    ?
                    `<span class="attendance-history-time check-out">
                        🔴 ${checkOut}
                    </span>`
                    :
                    `<span class="attendance-history-not-checked-out">
                        Not checked out
                    </span>`
                }

            </td>

            <td>

                <strong>
                    ${workingHours}
                </strong>

            </td>

            <td>

                <span class="attendance-history-status ${statusClass}">
                    ${status}
                </span>

            </td>

        `;

        tableBody.appendChild(row);

    });

}


// ==================================
// UPDATE ATTENDANCE SUMMARY
// ==================================

function updateAttendanceSummary(){

    const search =
        document.getElementById(
            "attendanceSearch"
        )?.value
        .toLowerCase()
        .trim() || "";


    const dateFilter =
        document.getElementById(
            "attendanceDateFilter"
        )?.value || "";


    const statusFilter =
        document.getElementById(
            "attendanceStatusFilter"
        )?.value || "all";


    const employeeFilter =
        document.getElementById(
            "attendanceEmployeeFilter"
        )?.value || "all";


    const records =
        attendanceRecords.filter(record => {

            const matchEmployee =
                employeeFilter === "all" ||
                Number(record.employeeIndex) ===
                Number(employeeFilter);


            const matchSearch =
                (record.employeeName || "")
                .toLowerCase()
                .includes(search);


            const matchDate =
                dateFilter === "" ||
                record.date === dateFilter;


            const matchStatus =
                statusFilter === "all" ||
                record.status === statusFilter;


            return (
                matchEmployee &&
                matchSearch &&
                matchDate &&
                matchStatus
            );

        });


    let present = 0;
    let absent = 0;
    let leave = 0;


    records.forEach(record => {

        if(record.status === "Present"){

            present++;

        }

        else if(record.status === "Absent"){

            absent++;

        }

        else if(record.status === "Leave"){

            leave++;

        }

    });


    const total =
        present +
        absent +
        leave;


    const rate =
        total > 0

        ?

        ((present / total) * 100)
            .toFixed(1)

        :

        "0";


    const presentElement =
        document.getElementById(
            "attendancePresentCount"
        );


    const absentElement =
        document.getElementById(
            "attendanceAbsentCount"
        );


    const leaveElement =
        document.getElementById(
            "attendanceLeaveCount"
        );


    const rateElement =
        document.getElementById(
            "attendanceRate"
        );


    if(presentElement)
        presentElement.innerText = present;


    if(absentElement)
        absentElement.innerText = absent;


    if(leaveElement)
        leaveElement.innerText = leave;


    if(rateElement)
        rateElement.innerText =
            rate + "%";

}


// ==================================
// LOAD EMPLOYEE TASKS
// ==================================

function loadEmployeeTasks(){

    const taskList =
        document.getElementById(
            "employeeTaskList"
        );


    if(!taskList){
        return;
    }


    taskList.innerHTML = "";


    if(employees.length === 0){

        taskList.innerHTML = `

            <div class="employee-task-empty">

                📋 No employee tasks available.

            </div>

        `;

        return;

    }


    const displayEmployees =
        employees
            .slice(-5)
            .reverse();


    displayEmployees.forEach(employee => {

        const task =
            (employee.task || "")
            .trim();


        const taskStatus =
            getEmployeeTaskStatus(task);


        taskList.innerHTML += `

            <div class="employee-task-card">

                <div class="employee-task-info">

                    <div class="employee-task-avatar">

                        ${
                            employee.photo

                            ?

                            `<img
                                src="${employee.photo}"
                                alt="${employee.name || "Employee"}"
                            >`

                            :

                            `👨‍💼`
                        }

                    </div>


                    <div>

                        <h4>
                            ${employee.name || "-"}
                        </h4>

                        <p>
                            ${task || "No task assigned"}
                        </p>

                    </div>

                </div>


                <div class="employee-task-meta">

                    <span class="employee-task-department">

                        ${employee.department || "No Department"}

                    </span>


                    <span
                        class="employee-task-status ${taskStatus.className}"
                    >

                        ${taskStatus.label}

                    </span>

                </div>

            </div>

        `;

    });

}


// ==================================
// EMPLOYEE DASHBOARD
// ==================================

function updateEmployeeDashboard(){

    // ----------------------------------
    // EMPLOYEE STATUS COUNTS
    // ----------------------------------

    const total = employees.length;

    let active = 0;
    let leave = 0;
    let inactive = 0;

    employees.forEach(employee => {

        if(employee.status === "Active"){
            active++;
        }

        else if(employee.status === "Leave"){
            leave++;
        }

        else if(employee.status === "Inactive"){
            inactive++;
        }

    });


    // ----------------------------------
    // TASK COUNTS
    // ----------------------------------

    let pending = 0;
    let progress = 0;
    let completed = 0;

    employees.forEach(employee => {

        const taskStatus =
            getEmployeeTaskStatus(employee.task);

        if(taskStatus.label === "Pending"){
            pending++;
        }

        else if(taskStatus.label === "Completed"){
            completed++;
        }

        else{
            progress++;
        }

    });


    // ----------------------------------
    // PERFORMANCE
    // ----------------------------------

    let performanceTotal = 0;
    let performanceCount = 0;

    employees.forEach(employee => {

        const performance =
            parseInt(employee.performance);

        if(!isNaN(performance)){

            performanceTotal += performance;
            performanceCount++;

        }

    });


    const averagePerformance =
        performanceCount > 0
        ?
        Math.round(
            performanceTotal /
            performanceCount
        )
        :
        0;


    // ----------------------------------
    // ATTENDANCE
    // ----------------------------------

    let present = 0;

    attendanceRecords.forEach(record => {

        if(record.status === "Present"){
            present++;
        }

    });


    const attendanceTotal =
        attendanceRecords.length;


    const attendanceRate =
        attendanceTotal > 0
        ?
        Math.round(
            (present / attendanceTotal) * 100
        )
        :
        0;


    // ----------------------------------
    // NEW EMPLOYEES
    // ----------------------------------

    let newEmployees = 0;

    const currentDate = new Date();

    employees.forEach(employee => {

        if(!employee.joinDate){
            return;
        }

        const joinDate =
            new Date(employee.joinDate);

        if(
            joinDate.getMonth() ===
            currentDate.getMonth()
            &&
            joinDate.getFullYear() ===
            currentDate.getFullYear()
        ){

            newEmployees++;

        }

    });


    // ----------------------------------
    // ACTIVE WORKFORCE %
    // ----------------------------------

    const activeWorkforce =
        total > 0
        ?
        Math.round(
            (active / total) * 100
        )
        :
        0;


    // ----------------------------------
    // TASK COMPLETION RATE
    // ----------------------------------

    const totalTasks =
        pending +
        progress +
        completed;


    const completionRate =
        totalTasks > 0
        ?
        Math.round(
            (completed / totalTasks) * 100
        )
        :
        0;


    // ----------------------------------
    // ATTENDANCE STATUS
    // ----------------------------------

    let attendanceStatus =
        "No Attendance Data";


    if(attendanceTotal > 0){

        if(attendanceRate >= 90){
            attendanceStatus =
                "Excellent Attendance";
        }

        else if(attendanceRate >= 75){
            attendanceStatus =
                "Good Attendance";
        }

        else{
            attendanceStatus =
                "Needs Improvement";
        }

    }


    // ----------------------------------
    // UPDATE TOTAL EMPLOYEES
    // ----------------------------------

    setEmployeeMetric("totalEmployees", total);
    setEmployeeMetric("activeEmployees", active);
    setEmployeeMetric("leaveEmployees", leave);
    setEmployeeMetric("inactiveEmployees", inactive);
    setEmployeeMetric("newEmployees", `▲ +${newEmployees} New Employees`);
    setEmployeeMetric("activeWorkforce", `${activeWorkforce}% Workforce Active`);
    setEmployeeMetric("completedTasks", completed);
    setEmployeeMetric("completionRate", `${completionRate}% Completion Rate`);
    setEmployeeMetric("attendanceRate", `${attendanceRate}%`);
    setEmployeeMetric("attendanceStatus", attendanceStatus);
    setEmployeeMetric(
        "employeeAveragePerformance",
        `${averagePerformance}%`
    );
    setEmployeeMetric(
        "employeeDashboardAttendanceRate",
        `${attendanceRate}%`
    );


    // ----------------------------------
    // REFRESH EMPLOYEE TASKS
    // ----------------------------------

    if(typeof loadEmployeeTasks === "function"){

        loadEmployeeTasks();

    }

}


// ==================================
// EMPLOYEE MANAGEMENT
// ==================================

function loadEmployeeManagement() {

    const tables = Array.from(
        document.querySelectorAll('[id="employeeManagementList"]')
    );

    if (!tables.length) return;

    const table = tables[0];
    table.innerHTML = "";

    const search =
        document.getElementById("managementEmployeeSearch")
            ?.value.toLowerCase().trim() || "";

    const department =
        document.getElementById("managementDepartmentFilter")
            ?.value || "all";

    const status =
        document.getElementById("managementStatusFilter")
            ?.value || "all";


    // FILTER EMPLOYEES
    const filteredEmployees = employees.filter(employee => {

        const matchSearch =
            (employee.name || "")
                .toLowerCase()
                .includes(search);

        const matchDepartment =
            department === "all" ||
            department === "" ||
            employee.department === department;

        const matchStatus =
            status === "all" ||
            status === "" ||
            employee.status === status;

        return (
            matchSearch &&
            matchDepartment &&
            matchStatus
        );

    });


    // SHOW RECENT 5 BY DEFAULT
    const isFiltering =
        search !== "" ||
        (department !== "all" && department !== "") ||
        (status !== "all" && status !== "");

    const displayEmployees = isFiltering
        ? filteredEmployees
        : filteredEmployees.slice(-5);


    // NO EMPLOYEES FOUND
    if (displayEmployees.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;padding:30px;">
                    👥 No employees found.
                </td>
            </tr>
        `;

        tables.slice(1).forEach(function (duplicateTable) {
            duplicateTable.innerHTML = table.innerHTML;
        });

        updateEmployeeManagementStats();
        return;
    }


    // RENDER EMPLOYEES
    displayEmployees.forEach(employee => {

        const employeeIndex = employees.indexOf(employee);

        const performance = Math.min(
            100,
            Math.max(
                0,
                parseInt(employee.performance) || 0
            )
        );

        table.innerHTML += `
            <tr>

                <td>
                    <div class="employee-info">

                        <img
                            class="employee-table-avatar"
                            src="${employee.photo || 'https://via.placeholder.com/45'}"
                            alt="${employee.name || 'Employee'}"
                        >

                        <div>
                            <strong>
                                ${employee.name || "-"}
                            </strong>

                            <small>
                                ${employee.email || "No Email"}
                            </small>
                        </div>

                    </div>
                </td>

                <td>
                    ${employee.department || "-"}
                </td>

                <td>
                    <span class="status-badge ${(employee.status || "").toLowerCase()}">
                        ${employee.status || "-"}
                    </span>
                </td>

                <td>
                    ${employee.task || "No Task"}
                </td>

                <td>
                    <div class="performance-box">

                        <div class="performance-bar">
                            <div
                                class="performance-fill"
                                style="width:${performance}%"
                            ></div>
                        </div>

                        <span>
                            ${employee.performance || "0%"}
                        </span>

                    </div>
                </td>

                <td>
                    $${employee.salary || "0"}
                </td>

                <td>
                    <div class="employee-action-buttons">

                        <button
                            type="button"
                            class="action-view"
                            onclick="viewEmployee(${employeeIndex})"
                        >
                            👁 View
                        </button>

                        <button
                            type="button"
                            class="action-edit"
                            onclick="editEmployee(${employeeIndex})"
                        >
                            ✏️ Edit
                        </button>

                        <button
                            type="button"
                            class="action-attendance"
                            data-employee-action="attendance"
                            data-employee-id="${employee.id}"
                        >
                            🟢 Attendance
                        </button>

                        <button
                            type="button"
                            class="action-delete"
                            onclick="deleteEmployee(${employeeIndex})"
                        >
                            🗑 Delete
                        </button>

                    </div>
                </td>

            </tr>
        `;

    });

    tables.slice(1).forEach(function (duplicateTable) {
        duplicateTable.innerHTML = table.innerHTML;
    });

    updateEmployeeManagementStats();

}


// ==================================
// MANAGEMENT STATS
// ==================================

function updateEmployeeManagementStats(){

    const total =
        employees.length;


    let active = 0;
    let leave = 0;
    let inactive = 0;


    employees.forEach(employee => {

        if(employee.status === "Active"){

            active++;

        }

        else if(employee.status === "Leave"){

            leave++;

        }

        else if(employee.status === "Inactive"){

            inactive++;

        }

    });


    setEmployeeMetric("managementTotalEmployees", total);
    setEmployeeMetric("managementActiveEmployees", active);
    setEmployeeMetric("managementLeaveEmployees", leave);
    setEmployeeMetric("managementInactiveEmployees", inactive);

}


// ==================================
// DEPARTMENT FILTER OPTIONS
// ==================================

function updateDepartmentFilters(){

    const departments = [
        ...new Set(
            employees
                .map(employee =>
                    (employee.department || "")
                    .trim()
                )
                .filter(Boolean)
        )
    ];


    const filterIds = [

        "departmentFilter",

        "managementDepartmentFilter"

    ];


    filterIds.forEach(id => {

        document.querySelectorAll(`[id="${id}"]`)
            .forEach(filter => {

                const currentValue = filter.value;
                const firstOption = filter.querySelector(
                    'option[value="all"]'
                );

                filter.innerHTML = "";

                if(firstOption){
                    filter.appendChild(firstOption.cloneNode(true));
                } else {
                    filter.innerHTML =
                        `<option value="all">All Departments</option>`;
                }

                departments.forEach(department => {

                    const option = document.createElement("option");
                    option.value = department;
                    option.textContent = department;
                    filter.appendChild(option);

                });

                filter.value = departments.includes(currentValue)
                    ? currentValue
                    : "all";

            });

    });

}


// ==================================
// INITIALIZE SYSTEM
// ==================================

function observeEmployeeComponents(){

    const componentIds = new Set([
        "employee-dashboard-container",
        "employee-tasks-container",
        "employee-table-container",
        "employee-management-container"
    ]);

    let refreshQueued = false;

    const observer = new MutationObserver(mutations => {

        if(!mutations.some(mutation =>
            componentIds.has(mutation.target.id)
        )){
            return;
        }

        if(refreshQueued){
            return;
        }

        refreshQueued = true;

        queueMicrotask(() => {

            refreshQueued = false;
            updateDepartmentFilters();
            loadEmployees();
            loadEmployeeManagement();
            loadEmployeeTasks();
            loadAttendanceEmployees();
            loadAttendanceHistory();
            updateAttendanceSummary();
            updateEmployeeSummary();
            updateEmployeeDashboard();
            loadTeamPermissions();

        });

    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

}

document.addEventListener(
    "DOMContentLoaded",
    () => {

        observeEmployeeComponents();

        // Employee

loadEmployees();

loadEmployeeManagement();

loadEmployeeTasks();

loadTeamPermissions();


        // Attendance
        loadAttendanceEmployees();

        loadAttendanceHistory();

        updateAttendanceSummary();


        // Dashboard
        updateEmployeeSummary();

        updateEmployeeDashboard();

        // ==================================
// ADD EMPLOYEE BUTTON
// ==================================

const addEmployeeBtn =
    document.getElementById(
        "addEmployeeBtn"
    );

if(addEmployeeBtn){

    addEmployeeBtn.addEventListener(
        "click",
        addEmployee
    );

}

        // Filters
        const searchEmployee =
            document.getElementById(
                "searchEmployee"
            );


        const departmentFilter =
            document.getElementById(
                "departmentFilter"
            );


        const statusFilterEmployee =
            document.getElementById(
                "statusFilterEmployee"
            );


        if(searchEmployee){

            searchEmployee.addEventListener(
                "input",
                loadEmployees
            );

        }


        if(departmentFilter){

            departmentFilter.addEventListener(
                "change",
                loadEmployees
            );

        }


        if(statusFilterEmployee){

            statusFilterEmployee.addEventListener(
                "change",
                loadEmployees
            );

        }


        // Export buttons
        exportEmployees =
            document.getElementById(
                "exportEmployees"
            );


        exportEmployeesPdf =
            document.getElementById(
                "exportEmployeesPdf"
            );


        if(exportEmployees){

            exportEmployees.addEventListener(
                "click",
                exportEmployeesCSV
            );

        }


        if(exportEmployeesPdf){

            exportEmployeesPdf.addEventListener(
                "click",
                exportEmployeesToPDF
            );

        }


        // Management filters
        const managementSearch =
            document.getElementById(
                "managementEmployeeSearch"
            );


        const managementDepartment =
            document.getElementById(
                "managementDepartmentFilter"
            );


        const managementStatus =
            document.getElementById(
                "managementStatusFilter"
            );


        if(managementSearch){

            managementSearch.addEventListener(
                "input",
                loadEmployeeManagement
            );

        }


        if(managementDepartment){

            managementDepartment.addEventListener(
                "change",
                loadEmployeeManagement
            );

        }


        if(managementStatus){

            managementStatus.addEventListener(
                "change",
                loadEmployeeManagement
            );

        }


        // Attendance filters
        const attendanceSearch =
            document.getElementById(
                "attendanceSearch"
            );


        const attendanceDate =
            document.getElementById(
                "attendanceDateFilter"
            );


        const attendanceStatus =
            document.getElementById(
                "attendanceStatusFilter"
            );


        const attendanceEmployee =
            document.getElementById(
                "attendanceEmployeeFilter"
            );


        const refreshAttendance = () => {

            loadAttendanceHistory();

            updateAttendanceSummary();

            updateEmployeeDashboard();

        };


        if(attendanceSearch){

            attendanceSearch.addEventListener(
                "input",
                refreshAttendance
            );

        }


        if(attendanceDate){

            attendanceDate.addEventListener(
                "change",
                refreshAttendance
            );

        }


        if(attendanceStatus){

            attendanceStatus.addEventListener(
                "change",
                refreshAttendance
            );

        }


        if(attendanceEmployee){

            attendanceEmployee.addEventListener(
                "change",
                refreshAttendance
            );

        }


        // Photo
        initializeEmployeePhoto();


        // Department filters
        updateDepartmentFilters();

    }
);

// ==========================
// SHOW ALL EMPLOYEES
// ==========================

function showAllEmployees(){

    const table =
        document.getElementById("employeeList");

    if(!table){
        return;
    }

    table.innerHTML = "";

    employees.forEach(employee => {

        const index =
            employees.indexOf(employee);

        const performance =
            parseInt(employee.performance) || 0;

        table.innerHTML += `

            <tr>

                <td>

                    <div class="employee-info">

                        <img
                            class="employee-table-avatar"
                            src="${employee.photo || 'https://via.placeholder.com/45'}"
                            alt="${employee.name}"
                        >

                        <div>

                            <h4>
                                ${employee.name}
                            </h4>

                            <small>
                                ${employee.email || "No Email"}
                            </small>

                        </div>

                    </div>

                </td>

                <td>
                    ${employee.department || "-"}
                </td>

                <td>

                    <span class="status-badge ${
                        (employee.status || "").toLowerCase()
                    }">

                        ${employee.status || "-"}

                    </span>

                </td>

                <td>
                    ${employee.task || "No Task"}
                </td>

                <td>

                    <div class="performance-box">

                        <div class="performance-bar">

                            <div
                                class="performance-fill"
                                style="width:${performance}%"
                            ></div>

                        </div>

                        <span>
                            ${employee.performance || "0%"}
                        </span>

                    </div>

                </td>

                <td>

                    <div class="employee-actions">

                        <button
                            class="action-view"
                            onclick="viewEmployee(${index})">

                            👁 View

                        </button>

                        <button
                            class="action-edit"
                            onclick="editEmployee(${index})">

                            ✏️ Edit

                        </button>

                        <button
                            class="action-attendance"
                            onclick="openAttendanceModal(${index})">

                            🟢 Attendance

                        </button>

                        <button
                            class="action-delete"
                            onclick="deleteEmployee(${index})">

                            🗑 Delete

                        </button>

                    </div>

                </td>

            </tr>

        `;

    });

}

// ==========================
// SHOW ALL EMPLOYEE MANAGEMENT
// ==========================

function showAllEmployeeManagement(){

    const table =
        document.getElementById("employeeManagementList");

    if(!table){
        return;
    }

    table.innerHTML = "";

    employees.forEach(employee => {

        const index =
            employees.indexOf(employee);

        const performance =
            parseInt(employee.performance) || 0;

        table.innerHTML += `

            <tr>

                <td>

                    <div class="employee-info">

                        <img
                            class="employee-table-avatar"
                            src="${employee.photo || 'https://via.placeholder.com/45'}"
                            alt="${employee.name}"
                        >

                        <div>

                            <strong>
                                ${employee.name}
                            </strong>

                            <small>
                                ${employee.email || "No Email"}
                            </small>

                        </div>

                    </div>

                </td>

                <td>
                    ${employee.department || "-"}
                </td>

                <td>

                    <span class="status-badge ${
                        (employee.status || "").toLowerCase()
                    }">

                        ${employee.status || "-"}

                    </span>

                </td>

                <td>
                    ${employee.task || "No Task"}
                </td>

                <td>

                    <div class="performance-box">

                        <div class="performance-bar">

                            <div
                                class="performance-fill"
                                style="width:${performance}%"
                            ></div>

                        </div>

                        <span>
                            ${employee.performance || "0%"}
                        </span>

                    </div>

                </td>

                <td>
                    $${employee.salary || "0"}
                </td>

                <td>

                    <div class="employee-actions">

                        <button
                            class="action-view"
                            onclick="viewEmployee(${index})">

                            👁 View

                        </button>

                        <button
                            class="action-edit"
                            onclick="editEmployee(${index})">

                            ✏️ Edit

                        </button>

                        <button
    type="button"
    class="action-attendance"
onclick="openAttendanceModal(${index})">
    🟢 Attendance
</button>

                        <button
                            class="action-delete"
                            onclick="deleteEmployee(${index})">

                            🗑 Delete

                        </button>

                    </div>

                </td>

            </tr>

        `;

    });

}

// ==================================
// TEAM PERMISSIONS
// ==================================

const TEAM_ROLES = [

    "Owner",

    "Manager",

    "Supervisor",

    "HR",

    "Accountant",

    "Sales",

    "Employee"

];


// ==================================
// ROLE PERMISSIONS
// ==================================

const ROLE_PERMISSIONS = {

    Owner: [

        "Full Workspace Access",

        "Manage Team",

        "Manage Finance",

        "Manage CRM",

        "Manage Inventory",

        "Manage Employees",

        "Manage Settings"

    ],


    Manager: [

        "Team Management",

        "CRM Access",

        "Sales Access",

        "Inventory Access",

        "Employee Access",

        "Reports Access"

    ],


    Supervisor: [

        "Employee Management",

        "Task Management",

        "Attendance Access",

        "Team Reports"

    ],


    HR: [

        "Employee Management",

        "Attendance Management",

        "Employee Reports"

    ],


    Accountant: [

        "Finance Access",

        "Transactions",

        "Expenses",

        "Invoices",

        "Financial Reports"

    ],


    Sales: [

        "CRM Access",

        "Customer Management",

        "Sales Pipeline",

        "Sales Reports"

    ],


    Employee: [

        "Personal Profile",

        "Assigned Tasks",

        "Attendance"

    ]

};


// ==================================
// LOAD TEAM PERMISSIONS
// ==================================

function loadTeamPermissions(){

    const container =
        document.getElementById(
            "teamPermissionsList"
        );


    if(!container){

        return;

    }


    container.innerHTML = "";


    if(employees.length === 0){

        container.innerHTML = `

            <div class="team-permissions-empty">

                👥 No team members found.

            </div>

        `;

        return;

    }


    employees.forEach(
        (employee, index) => {


        const role =
            employee.role || "Employee";


        const permissions =
            ROLE_PERMISSIONS[role] ||
            ROLE_PERMISSIONS.Employee;


        container.innerHTML += `

            <div class="team-permission-card">


                <!-- EMPLOYEE -->

                <div class="team-permission-member">


                    <div class="team-permission-avatar">

                        ${
                            employee.photo

                            ?

                            `<img
                                src="${employee.photo}"
                                alt="${employee.name || "Employee"}"
                            >`

                            :

                            `👤`
                        }

                    </div>


                    <div class="team-permission-info">

                        <h4>
                            ${employee.name || "Employee"}
                        </h4>


                        <p>
                            ${
                                employee.department ||
                                "No Department"
                            }
                        </p>

                    </div>

                </div>


                <!-- ROLE -->

                <div class="team-permission-role">

                    <label>
                        Role
                    </label>


                    <select
                        onchange="
                            changeEmployeeRole(
                                ${index},
                                this.value
                            )
                        "
                    >

                        ${
                            TEAM_ROLES.map(
                                roleName => `

                                    <option
                                        value="${roleName}"

                                        ${
                                            roleName === role
                                            ? "selected"
                                            : ""
                                        }
                                    >

                                        ${roleName}

                                    </option>

                                `
                            ).join("")
                        }

                    </select>

                </div>


                <!-- ACCESS -->

                <div class="team-permission-access">

                    <span>
                        Access
                    </span>


                    <div class="permission-tags">

                        ${
                            permissions.map(
                                permission => `

                                    <span
                                        class="permission-tag"
                                    >

                                        ${permission}

                                    </span>

                                `
                            ).join("")
                        }

                    </div>

                </div>


                <!-- STATUS -->

                <div class="team-permission-status">

                    <span
                        class="status-badge ${
                            (
                                employee.status ||
                                "Active"
                            ).toLowerCase()
                        }"
                    >

                        ${
                            employee.status ||
                            "Active"
                        }

                    </span>

                </div>


            </div>

        `;

    });

}


// ==================================
// CHANGE EMPLOYEE ROLE
// ==================================

function changeEmployeeRole(
    index,
    role
){

    const employee =
        employees[index];


    if(!employee){

        return;

    }


    if(!TEAM_ROLES.includes(role)){

        return;

    }


    employee.role =
        role;


    saveEmployees();


    loadTeamPermissions();


    loadEmployees();

    loadEmployeeManagement();

    loadEmployeeTasks();


    alert(
        `${employee.name} role changed to ${role}.`
    );

}

// ==================================
// ADD EMPLOYEE BUTTON
// ==================================

document.addEventListener("DOMContentLoaded", function () {

    const addEmployeeBtn =
        document.getElementById("addEmployeeBtn");

    if (addEmployeeBtn) {

        addEmployeeBtn.onclick = function () {
            addEmployee();
        };

    }

});

// ==================================
// ATTENDANCE HISTORY FILTERS
// ==================================

document.addEventListener("click", function(event){

    if(!(event.target instanceof Element)){
        return;
    }

    const button = event.target.closest("button");

    if(!button){
        return;
    }

    if(
        button.id === "exportEmployees" ||
        button.id === "managementExportEmployees"
    ){
        event.preventDefault();
        exportEmployeesCSV();
        return;
    }

    if(
        button.id === "exportEmployeesPdf" ||
        button.id === "managementExportEmployeesPdf"
    ){
        event.preventDefault();
        exportEmployeesToPDF();
        return;
    }

    const editAttendanceButton =
        button.closest("[data-attendance-edit]");

    if(editAttendanceButton){
        editAttendance(
            editAttendanceButton.dataset.attendanceEdit
        );
        return;
    }

    const deleteAttendanceButton =
        button.closest("[data-attendance-delete]");

    if(deleteAttendanceButton){
        deleteAttendance(
            deleteAttendanceButton.dataset.attendanceDelete
        );
    }

});

document.addEventListener("input", function(event){

    if(event.target.id === "managementEmployeeSearch"){

        document.querySelectorAll('[id="managementEmployeeSearch"]')
            .forEach(input => {
                if(input !== event.target){
                    input.value = event.target.value;
                }
            });

        loadEmployeeManagement();
    }

    if(event.target.id === "attendanceSearch"){
        renderEmployeeAttendanceHistory();
    }

});

document.addEventListener("change", function(event){

    if(
        event.target.id === "managementDepartmentFilter" ||
        event.target.id === "managementStatusFilter"
    ){

        document.querySelectorAll(`[id="${event.target.id}"]`)
            .forEach(filter => {
                if(filter !== event.target){
                    filter.value = event.target.value;
                }
            });

        loadEmployeeManagement();
    }

    if(
        event.target.id === "attendanceEmployeeFilter" ||
        event.target.id === "attendanceDateFilter" ||
        event.target.id === "attendanceStatusFilter"
    ){
        renderEmployeeAttendanceHistory();
    }

});

document.addEventListener("input", function(e){

    if(e.target.id === "attendanceHistorySearch"){
        loadAttendanceHistory();
    }

});

document.addEventListener("change", function(e){

    if(
        e.target.id === "attendanceHistoryDate" ||
        e.target.id === "attendanceHistoryStatus"
    ){
        loadAttendanceHistory();
    }

});

document.addEventListener("click", function(e){

    if(e.target.id === "clearAttendanceHistoryFiltersBtn"){

        const search =
            document.getElementById("attendanceHistorySearch");

        const date =
            document.getElementById("attendanceHistoryDate");

        const status =
            document.getElementById("attendanceHistoryStatus");

        if(search){
            search.value = "";
        }

        if(date){
            date.value = "";
        }

        if(status){
            status.value = "";
        }

        loadAttendanceHistory();
    }

});