/* ==========================================
   SYNVORA AI - COMPANY SETTINGS
========================================== */


/* ==========================================
   LOAD ACTIVE COMPANY SETTINGS
========================================== */

function loadCompanySettings(){

    const savedCompany =
        localStorage.getItem(
            "synvoraActiveCompany"
        );


    if(!savedCompany){

        console.log(
            "No active company selected."
        );

        return;

    }


    const company =
        JSON.parse(savedCompany);


    /* ==========================================
       COMPANY PROFILE
    ========================================== */

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

        const companyOwner =
    document.getElementById(
        "settingsCompanyOwner"
    );


    if(companyName){

        companyName.value =
            company.name || "";

    }


    if(companyType){

        companyType.value =
            company.type || "";

    }


    if(companyEmail){

        companyEmail.value =
            company.email || "";

    }


    if(companyPhone){

        companyPhone.value =
            company.phone || "";

    }

    if(companyOwner){

    companyOwner.value =
        company.owner || "";

}


    /* ==========================================
       BUSINESS PREFERENCES
    ========================================== */

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


    if(currency){

        currency.value =
            company.currency || "USD";

    }


    if(country){

        country.value =
            company.country || "";

    }


    if(status){

        status.value =
            company.status || "Active";

    }


    /* ==========================================
       WORKSPACE PREFERENCES
    ========================================== */

    const preferences =
        company.settings || {};


    const notifications =
        document.getElementById(
            "settingsNotifications"
        );

    const alerts =
        document.getElementById(
            "settingsAlerts"
        );

    const aiAssistant =
        document.getElementById(
            "settingsAI"
        );


    if(notifications){

        notifications.checked =
            preferences.notifications ?? true;

    }


    if(alerts){

        alerts.checked =
            preferences.alerts ?? true;

    }


    if(aiAssistant){

        aiAssistant.checked =
            preferences.aiAssistant ?? true;

    }

    const twoFactor =
    document.getElementById(
        "settingsTwoFactor"
    );


if(twoFactor){

    twoFactor.checked =
        preferences.twoFactor ?? false;

}

    console.log(
        "Company Settings Loaded:",
        company.name
    );

}


/* ==========================================
   SAVE COMPANY SETTINGS
========================================== */

function saveCompanySettings(){

    const savedCompany =
        localStorage.getItem(
            "synvoraActiveCompany"
        );


    if(!savedCompany){

        alert(
            "Please select a company first."
        );

        return;

    }


    const company =
        JSON.parse(savedCompany);


    /* ==========================================
       GET UPDATED VALUES
    ========================================== */

    const name =
        document.getElementById(
            "settingsCompanyName"
        ).value.trim();


    const type =
        document.getElementById(
            "settingsCompanyType"
        ).value.trim();


    const email =
        document.getElementById(
            "settingsCompanyEmail"
        ).value.trim();


    const phone =
        document.getElementById(
            "settingsCompanyPhone"
        ).value.trim();

        const owner =
    document.getElementById(
        "settingsCompanyOwner"
    ).value.trim();


    const currency =
        document.getElementById(
            "settingsCurrency"
        ).value;


    const country =
        document.getElementById(
            "settingsCountry"
        ).value.trim();


    const status =
        document.getElementById(
            "settingsBusinessStatus"
        ).value;


    /* ==========================================
       UPDATE COMPANY DATA
    ========================================== */

    company.name =
        name;

    company.type =
        type;

    company.email =
        email;

    company.phone =
        phone;

        company.owner =
    owner;

    company.currency =
        currency;

    company.country =
        country;

    company.status =
        status;


    /* ==========================================
       GET WORKSPACE PREFERENCES
    ========================================== */

    const notifications =
        document.getElementById(
            "settingsNotifications"
        )?.checked ?? true;


    const alerts =
        document.getElementById(
            "settingsAlerts"
        )?.checked ?? true;


    const aiAssistant =
        document.getElementById(
            "settingsAI"
        )?.checked ?? true;


    /* ==========================================
       SAVE PREFERENCES INSIDE COMPANY
    ========================================== */

    company.settings =
        company.settings || {};


    company.settings.notifications =
        notifications;


    company.settings.alerts =
        alerts;


    company.settings.aiAssistant =
        aiAssistant;

        const twoFactor =
    document.getElementById(
        "settingsTwoFactor"
    )?.checked ?? false;


company.settings.twoFactor =
    twoFactor;


    /* ==========================================
       SAVE ACTIVE COMPANY
    ========================================== */

    localStorage.setItem(
        "synvoraActiveCompany",
        JSON.stringify(company)
    );


    /* ==========================================
       UPDATE COMPANY LIST
    ========================================== */

    const companies =
        JSON.parse(
            localStorage.getItem(
                "synvoraCompanies"
            )
        ) || [];


    const companyIndex =
        companies.findIndex(
            item =>
                item.id === company.id
        );


    if(companyIndex !== -1){

        companies[companyIndex] =
            company;


        localStorage.setItem(
            "synvoraCompanies",
            JSON.stringify(companies)
        );

    }


    /* ==========================================
       UPDATE ACTIVE WORKSPACE UI
    ========================================== */

    if(
        typeof updateActiveCompanyWorkspace ===
        "function"
    ){

        updateActiveCompanyWorkspace();

    }


    /* ==========================================
       UPDATE COMPANY MANAGEMENT
    ========================================== */

    if(
        typeof loadCompanies ===
        "function"
    ){

        loadCompanies();

    }


    /* ==========================================
       UPDATE COMPANY WORKSPACE
    ========================================== */

    if(
        typeof populateCompanyWorkspace ===
        "function"
    ){

        populateCompanyWorkspace();

    }


    /* ==========================================
       SUCCESS
    ========================================== */

    alert(
        "Company Settings Saved Successfully."
    );


    console.log(
        "Company Settings Updated:",
        company
    );

}

/* ==========================================
   TEAM PERMISSIONS
========================================== */

function openTeamPermissions(){

    const target =
        document.getElementById(
            "employee-management-container"
        );

    if(!target){

        console.error(
            "Employee Management container not found."
        );

        return;

    }

    target.scrollIntoView({

        behavior: "smooth",

        block: "start"

    });

}

/* ==========================================
   ACCOUNT SECURITY
========================================== */

function openAccountSecurity(){

    const target =
        document.getElementById(
            "account-security-section"
        );

    if(!target){

        console.error(
            "Account Security section not found."
        );

        return;

    }

    target.scrollIntoView({

        behavior: "smooth",

        block: "start"

    });

}

/* ==========================================
   ACCOUNT SECURITY ACTIONS
========================================== */

/* ==========================================
   CHANGE ACCOUNT PASSWORD
========================================== */

function changeAccountPassword(){

    let modal =
        document.getElementById(
            "changePasswordModal"
        );


    if(!modal){

        modal =
            document.createElement("div");

        modal.id =
            "changePasswordModal";

        modal.className =
            "company-modal";


        modal.innerHTML = `

            <div class="security-modal-box">

                <div class="security-modal-header">

                    <div>

                        <span class="company-eyebrow">
                            ACCOUNT SECURITY
                        </span>

                        <h2>
                            🔐 Change Password
                        </h2>

                    </div>


                    <button
                        type="button"
                        class="company-close-btn"
                        onclick="closeChangePasswordModal()">

                        ✕

                    </button>

                </div>


                <div class="security-form">

                    <div class="security-field">

                        <label>
                            Current Password
                        </label>

                        <input
                            type="password"
                            id="currentPasswordInput"
                            placeholder="Enter current password">

                    </div>


                    <div class="security-field">

                        <label>
                            New Password
                        </label>

                        <input
                            type="password"
                            id="newPasswordInput"
                            placeholder="Enter new password">

                    </div>


                    <div class="security-field">

                        <label>
                            Confirm New Password
                        </label>

                        <input
                            type="password"
                            id="confirmPasswordInput"
                            placeholder="Confirm new password">

                    </div>


                    <div class="security-password-hint">

                        🔒 Password must contain at least
                        8 characters.

                    </div>

                </div>


                <div class="security-modal-actions">

                    <button
                        type="button"
                        class="secondary-btn"
                        onclick="closeChangePasswordModal()">

                        Cancel

                    </button>


                    <button
                        type="button"
                        class="settings-action-btn"
                        onclick="saveNewAccountPassword()">

                        🔐 Change Password

                    </button>

                </div>

            </div>

        `;


        document.body.appendChild(modal);

    }


    modal.classList.add("active");

}


/* ==========================================
   SAVE NEW PASSWORD
========================================== */

function saveNewAccountPassword(){

    const currentPassword =
        document.getElementById(
            "currentPasswordInput"
        )?.value.trim();


    const newPassword =
        document.getElementById(
            "newPasswordInput"
        )?.value;


    const confirmPassword =
        document.getElementById(
            "confirmPasswordInput"
        )?.value;


    if(!currentPassword){

        alert(
            "Please enter your current password."
        );

        return;

    }


    if(!newPassword){

        alert(
            "Please enter your new password."
        );

        return;

    }


    if(newPassword.length < 8){

        alert(
            "New password must contain at least 8 characters."
        );

        return;

    }


    if(newPassword !== confirmPassword){

        alert(
            "New passwords do not match."
        );

        return;

    }


    closeChangePasswordModal();


showSecuritySuccess(
    "Password Changed",
    "Your account password has been changed successfully.",
    "🔐"
);

}


/* ==========================================
   CLOSE CHANGE PASSWORD MODAL
========================================== */

function closeChangePasswordModal(){

    const modal =
        document.getElementById(
            "changePasswordModal"
        );


    if(!modal){

        return;

    }


    modal.classList.remove("active");

}





/* ==========================================
   LOGIN SESSIONS
========================================== */

function manageLoginSessions(){

    let modal =
        document.getElementById(
            "loginSessionsModal"
        );


    if(!modal){

        modal =
            document.createElement("div");

        modal.id =
            "loginSessionsModal";

        modal.className =
            "company-modal";


        modal.innerHTML = `

            <div class="company-modal-box">

                <div class="company-modal-header">

                    <div>

                        <span class="company-eyebrow">
                            ACCOUNT SECURITY
                        </span>

                        <h2>
                            💻 Login Sessions
                        </h2>

                    </div>


                    <button
                        class="company-close-btn"
                        type="button"
                        onclick="closeLoginSessions()">

                        ✕

                    </button>

                </div>


                <div
                    id="loginSessionsList"
                    class="login-sessions-list">

                </div>


                <div class="company-modal-actions">

                    <button
                        class="settings-action-btn danger"
                        type="button"
                        onclick="signOutAllDevices()">

                        🚪 Sign Out All Devices

                    </button>

                </div>

            </div>

        `;


        document.body.appendChild(modal);

    }


    loadLoginSessions();


    modal.classList.add("active");

}

/* ==========================================
   LOAD LOGIN SESSIONS
========================================== */

function loadLoginSessions(){

    const list =
        document.getElementById(
            "loginSessionsList"
        );


    if(!list){

        return;

    }


    const sessions = [

        {
            device: "Windows Desktop",
            browser: "Chrome",
            location: "Current Device",
            status: "Active Now"
        },

        {
            device: "Android Mobile",
            browser: "Chrome Mobile",
            location: "Mobile Device",
            status: "Recently Active"
        }

    ];


    list.innerHTML = "";


    sessions.forEach(
        (session, index) => {

            const item =
                document.createElement("div");

            item.className =
                "login-session-item";


            item.innerHTML = `

                <span class="login-session-icon">
                    💻
                </span>


                <div class="login-session-info">

                    <strong>
                        ${session.device}
                    </strong>

                    <small>
                        ${session.browser}
                        •
                        ${session.location}
                    </small>

                    <small>
                        ${session.status}
                    </small>

                </div>


                ${
                    index === 0
                    ?
                    `
                    <span class="login-session-current">
                        Current
                    </span>
                    `
                    :
                    `
                    <button
                        class="settings-action-btn danger"
                        type="button"
                        onclick="signOutLoginSession(${index})">

                        Sign Out

                    </button>
                    `
                }

            `;


            list.appendChild(item);

        }
    );

}

/* ==========================================
   CLOSE LOGIN SESSIONS
========================================== */

function closeLoginSessions(){

    const modal =
        document.getElementById(
            "loginSessionsModal"
        );


    if(!modal){

        return;

    }


    modal.classList.remove("active");

}

/* ==========================================
   SIGN OUT LOGIN SESSION
========================================== */

/* ==========================================
   CUSTOM SESSION SIGN OUT CONFIRMATION
========================================== */

function signOutLoginSession(index){

    let modal =
        document.getElementById(
            "sessionSignOutModal"
        );


    if(!modal){

        modal =
            document.createElement("div");

        modal.id =
            "sessionSignOutModal";

        modal.className =
            "company-modal";


        modal.innerHTML = `

            <div class="session-confirm-box">

                <div class="session-confirm-icon">
                    🚪
                </div>


                <h3>
                    Sign Out Device?
                </h3>


                <p>
                    Are you sure you want to sign out
                    this device?
                </p>


                <div class="session-confirm-actions">

                    <button
                        type="button"
                        class="secondary-btn"
                        onclick="closeSessionSignOutModal()">

                        Cancel

                    </button>


                    <button
                        type="button"
                        class="settings-action-btn danger"
                        onclick="confirmSessionSignOut(${index})">

                        Sign Out

                    </button>

                </div>

            </div>

        `;


        document.body.appendChild(modal);

    }


    modal.classList.add("active");

}

/* ==========================================
   CONFIRM SESSION SIGN OUT
========================================== */

function confirmSessionSignOut(index){

    closeSessionSignOutModal();


    alert(
        "This device session will be signed out when real authentication is connected."
    );

}

/* ==========================================
   CLOSE SESSION SIGN OUT MODAL
========================================== */

function closeSessionSignOutModal(){

    const modal =
        document.getElementById(
            "sessionSignOutModal"
        );


    if(!modal){

        return;

    }


    modal.classList.remove("active");

}


/* ==========================================
   CUSTOM SIGN OUT ALL DEVICES
========================================== */

function signOutAllDevices(){

    let modal =
        document.getElementById(
            "signOutAllDevicesModal"
        );


    if(!modal){

        modal =
            document.createElement("div");

        modal.id =
            "signOutAllDevicesModal";

        modal.className =
            "company-modal";


        modal.innerHTML = `

            <div class="session-confirm-box">

                <div class="session-confirm-icon">
                    🚪
                </div>


                <h3>
                    Sign Out All Devices?
                </h3>


                <p>
                    This will sign out your account
                    from all currently active devices.
                </p>


                <div class="session-confirm-actions">

                    <button
                        type="button"
                        class="secondary-btn"
                        onclick="closeSignOutAllDevicesModal()">

                        Cancel

                    </button>


                    <button
    type="button"
    class="settings-action-btn"
    onclick="confirmSignOutAllDevices()">

    🚪 Sign Out All

</button>

                </div>

            </div>

        `;


        document.body.appendChild(modal);

    }


    modal.classList.add("active");

}


/* ==========================================
   CONFIRM SIGN OUT ALL DEVICES
========================================== */

function confirmSignOutAllDevices(){

    closeSignOutAllDevicesModal();


    showSecuritySuccess(
        "Signed Out From All Devices",
        "Your account will be signed out from all other devices when Synvora AI authentication is connected.",
        "🚪"
    );

}


/* ==========================================
   CLOSE SIGN OUT ALL DEVICES MODAL
========================================== */

function closeSignOutAllDevicesModal(){

    const modal =
        document.getElementById(
            "signOutAllDevicesModal"
        );


    if(!modal){

        return;

    }


    modal.classList.remove("active");

}

/* ==========================================
   TWO-FACTOR AUTHENTICATION
========================================== */

/* ==========================================
   TWO-FACTOR AUTHENTICATION
========================================== */

function toggleTwoFactor(){

    const twoFactor =
        document.getElementById(
            "settingsTwoFactor"
        );


    if(!twoFactor){

        return;

    }


    const savedCompany =
        localStorage.getItem(
            "synvoraActiveCompany"
        );


    if(!savedCompany){

        twoFactor.checked = false;

        showSecurityMessage(
            "Please select a company first."
        );

        return;

    }


    const company =
        JSON.parse(savedCompany);


    const enabled =
        twoFactor.checked;


    showTwoFactorModal(
        company,
        enabled
    );

}


/* ==========================================
   TWO-FACTOR CONFIRMATION MODAL
========================================== */

function showTwoFactorModal(
    company,
    enabled
){

    let modal =
        document.getElementById(
            "twoFactorModal"
        );


    if(!modal){

        modal =
            document.createElement("div");

        modal.id =
            "twoFactorModal";

        modal.className =
            "company-modal";


        document.body.appendChild(modal);

    }


    modal.innerHTML = `

        <div class="security-confirm-box">

            <div class="security-confirm-icon">

                ${enabled ? "🛡️" : "🔓"}

            </div>


            <span class="company-eyebrow">
                ACCOUNT SECURITY
            </span>


            <h3>
                ${
                    enabled
                    ? "Enable Two-Factor Authentication?"
                    : "Disable Two-Factor Authentication?"
                }
            </h3>


            <p>

                ${
                    enabled
                    ?
                    "Two-factor authentication will add an extra security layer to your Synvora AI account."
                    :
                    "Disabling two-factor authentication will reduce the security of this account."
                }

            </p>


            <div class="security-confirm-actions">

                <button
                    type="button"
                    class="secondary-btn"
                    onclick="cancelTwoFactorChange()">

                    Cancel

                </button>


                <button
                    type="button"
                    class="
                        settings-action-btn
                        ${enabled ? "" : "danger"}
                    "
                    onclick="confirmTwoFactorChange(${enabled})">

                    ${
                        enabled
                        ? "🛡️ Enable 2FA"
                        : "🔓 Disable 2FA"
                    }

                </button>

            </div>

        </div>

    `;


    modal.classList.add("active");

}


/* ==========================================
   CONFIRM TWO-FACTOR
========================================== */

function confirmTwoFactorChange(enabled){

    const savedCompany =
        localStorage.getItem(
            "synvoraActiveCompany"
        );


    if(!savedCompany){

        cancelTwoFactorChange();

        return;

    }


    const company =
        JSON.parse(savedCompany);


    company.settings =
        company.settings || {};


    company.settings.twoFactor =
        enabled;


    /* SAVE ACTIVE COMPANY */

    localStorage.setItem(
        "synvoraActiveCompany",
        JSON.stringify(company)
    );


    /* UPDATE COMPANY LIST */

    const companies =
        JSON.parse(
            localStorage.getItem(
                "synvoraCompanies"
            )
        ) || [];


    const companyIndex =
        companies.findIndex(
            item =>
                item.id === company.id
        );


    if(companyIndex !== -1){

        companies[companyIndex] =
            company;


        localStorage.setItem(
            "synvoraCompanies",
            JSON.stringify(companies)
        );

    }


    const twoFactor =
        document.getElementById(
            "settingsTwoFactor"
        );


    if(twoFactor){

        twoFactor.checked =
            enabled;

    }


    closeTwoFactorModal();


    closeTwoFactorModal();


if(enabled){

    showSecuritySuccess(
        "Two-Factor Authentication Enabled",
        "Two-Factor Authentication is now active on your account.",
        "🛡️"
    );

}
else{

    showSecuritySuccess(
        "Two-Factor Authentication Disabled",
        "Two-Factor Authentication has been disabled on your account.",
        "🔓"
    );

}

}


/* ==========================================
   CANCEL TWO-FACTOR CHANGE
========================================== */

function cancelTwoFactorChange(){

    const twoFactor =
        document.getElementById(
            "settingsTwoFactor"
        );


    if(twoFactor){

        const savedCompany =
            localStorage.getItem(
                "synvoraActiveCompany"
            );


        if(savedCompany){

            const company =
                JSON.parse(savedCompany);


            twoFactor.checked =
                company.settings?.twoFactor ?? false;

        }

    }


    closeTwoFactorModal();

}


/* ==========================================
   CLOSE TWO-FACTOR MODAL
========================================== */

function closeTwoFactorModal(){

    const modal =
        document.getElementById(
            "twoFactorModal"
        );


    if(!modal){

        return;

    }


    modal.classList.remove("active");

}


/* ==========================================
   SECURITY MESSAGE
========================================== */

function showSecurityMessage(message){

    alert(message);

}

/* ==========================================
   TWO-FACTOR EVENT
========================================== */

document.addEventListener(
    "change",
    function(event){

        if(
            event.target.id ===
            "settingsTwoFactor"
        ){

            toggleTwoFactor();

        }

    }
);

/* ==========================================
   SECURITY SUCCESS MODAL
========================================== */

function showSecuritySuccess(
    title,
    message,
    icon = "✓"
){

    let modal =
        document.getElementById(
            "securitySuccessModal"
        );


    if(!modal){

        modal =
            document.createElement("div");

        modal.id =
            "securitySuccessModal";

        modal.className =
            "company-modal";


        modal.innerHTML = `

            <div class="security-success-box">

                <div class="security-success-icon">

                    ${icon}

                </div>


                <span class="company-eyebrow">
                    SYNVORA AI SECURITY
                </span>


                <h3
                    id="securitySuccessTitle">
                </h3>


                <p
                    id="securitySuccessMessage">
                </p>


                <div class="security-success-actions">

                    <button
                        type="button"
                        class="settings-action-btn"
                        onclick="closeSecuritySuccess()">

                        Done

                    </button>

                </div>

            </div>

        `;


        document.body.appendChild(modal);

    }


    document.getElementById(
        "securitySuccessTitle"
    ).textContent =
        title;


    document.getElementById(
        "securitySuccessMessage"
    ).textContent =
        message;


    const iconElement =
        modal.querySelector(
            ".security-success-icon"
        );


    if(iconElement){

        iconElement.textContent =
            icon;

    }


    modal.classList.add(
        "active"
    );

}


/* ==========================================
   CLOSE SECURITY SUCCESS
========================================== */

function closeSecuritySuccess(){

    const modal =
        document.getElementById(
            "securitySuccessModal"
        );


    if(!modal){

        return;

    }


    modal.classList.remove(
        "active"
    );

}

/* ==========================================
   PREMIUM COMPANY SETTINGS
========================================== */

function getActiveSettingsCompany() {
    try {
        return JSON.parse(
            localStorage.getItem("synvoraActiveCompany")
        );
    } catch (error) {
        return null;
    }
}

function setSettingsValue(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.value = value || "";
    }
}

function setSettingsText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

function getSettingsInputValue(id) {
    return document.getElementById(id)?.value.trim() || "";
}

function showCompanySettingsState(message, type = "ready") {
    const state = document.getElementById("settingsSaveState");

    if (!state) return;

    state.textContent = message;
    state.className = "settings-save-state " + type;
}


/* LOAD ACTIVE COMPANY */

function loadCompanySettings() {
    const company = getActiveSettingsCompany();

    if (!company) {
        setSettingsText(
            "settingsActiveCompanyName",
            "No Company Selected"
        );

        setSettingsText(
            "settingsActiveCompanyMeta",
            "Select a company from Company Management."
        );

        showCompanySettingsState(
            "Select a company first to update its settings.",
            "error"
        );

        return;
    }

    const preferences = company.settings || {};

    setSettingsText(
        "settingsActiveCompanyName",
        company.name || "Unnamed Company"
    );

    setSettingsText(
        "settingsActiveCompanyMeta",
        [
            company.industry || company.type || "Business",
            company.currency || "PKR",
            company.status || "Active"
        ].join(" • ")
    );

    setSettingsValue("settingsCompanyName", company.name);
    setSettingsValue("settingsCompanyOwner", company.owner);
    setSettingsValue("settingsCompanyCode", company.code);
    setSettingsValue("settingsCompanyIndustry", company.industry);
    setSettingsValue("settingsCompanyType", company.type);
    setSettingsValue("settingsCompanyEmail", company.email);
    setSettingsValue("settingsCompanyPhone", company.phone);
    setSettingsValue("settingsCompanyWebsite", company.website);

    setSettingsValue("settingsCurrency", company.currency || "PKR");
    setSettingsValue("settingsCountry", company.country);
    setSettingsValue(
        "settingsTimezone",
        preferences.timezone || "Asia/Karachi"
    );
    setSettingsValue(
        "settingsFiscalYear",
        company.fiscalYear || "January"
    );
    setSettingsValue("settingsTaxId", company.taxId);
    setSettingsValue(
        "settingsInvoicePrefix",
        preferences.invoicePrefix || ""
    );
    setSettingsValue(
        "settingsBusinessStatus",
        company.status || "Active"
    );
    setSettingsValue(
        "settingsLanguage",
        preferences.language || "English"
    );
    setSettingsValue("settingsCompanyAddress", company.address);
    setSettingsValue(
        "settingsCompanyDescription",
        company.description
    );

    const notifications =
        document.getElementById("settingsNotifications");

    const alerts =
        document.getElementById("settingsAlerts");

    const aiAssistant =
        document.getElementById("settingsAI");

    const weeklySummary =
        document.getElementById("settingsWeeklySummary");

    if (notifications) {
        notifications.checked =
            preferences.notifications ?? true;
    }

    if (alerts) {
        alerts.checked =
            preferences.alerts ?? true;
    }

    if (aiAssistant) {
        aiAssistant.checked =
            preferences.aiAssistant ?? true;
    }

    if (weeklySummary) {
        weeklySummary.checked =
            preferences.weeklySummary ?? true;
    }

    showCompanySettingsState(
        "Settings loaded for " + (company.name || "this company") + ".",
        "ready"
    );
}


/* SAVE COMPANY SETTINGS */

function saveCompanySettings() {
    const activeCompany = getActiveSettingsCompany();

    if (!activeCompany) {
        showCompanySettingsState(
            "Please select a company first.",
            "error"
        );
        return;
    }

    const name = getSettingsInputValue("settingsCompanyName");
    const owner = getSettingsInputValue("settingsCompanyOwner");

    if (!name) {
        showCompanySettingsState(
            "Company name is required.",
            "error"
        );
        return;
    }

    if (!owner) {
        showCompanySettingsState(
            "Owner name is required.",
            "error"
        );
        return;
    }

    const updatedCompany = {
        ...activeCompany,

        name: name,
        owner: owner,
        code: getSettingsInputValue(
            "settingsCompanyCode"
        ).toUpperCase(),
        industry: document.getElementById(
            "settingsCompanyIndustry"
        )?.value || "",
        type: getSettingsInputValue("settingsCompanyType"),
        email: getSettingsInputValue("settingsCompanyEmail"),
        phone: getSettingsInputValue("settingsCompanyPhone"),
        website: getSettingsInputValue("settingsCompanyWebsite"),

        currency: document.getElementById(
            "settingsCurrency"
        )?.value || "PKR",

        country: getSettingsInputValue("settingsCountry"),

        fiscalYear: document.getElementById(
            "settingsFiscalYear"
        )?.value || "January",

        taxId: getSettingsInputValue("settingsTaxId"),

        status: document.getElementById(
            "settingsBusinessStatus"
        )?.value || "Active",

        address: getSettingsInputValue(
            "settingsCompanyAddress"
        ),

        description: getSettingsInputValue(
            "settingsCompanyDescription"
        ),

        settings: {
            ...(activeCompany.settings || {}),

            timezone: document.getElementById(
                "settingsTimezone"
            )?.value || "Asia/Karachi",

            language: document.getElementById(
                "settingsLanguage"
            )?.value || "English",

            invoicePrefix: getSettingsInputValue(
                "settingsInvoicePrefix"
            ).toUpperCase(),

            notifications: document.getElementById(
                "settingsNotifications"
            )?.checked ?? true,

            alerts: document.getElementById(
                "settingsAlerts"
            )?.checked ?? true,

            aiAssistant: document.getElementById(
                "settingsAI"
            )?.checked ?? true,

            weeklySummary: document.getElementById(
                "settingsWeeklySummary"
            )?.checked ?? true
        }
    };

    localStorage.setItem(
        "synvoraActiveCompany",
        JSON.stringify(updatedCompany)
    );

    let savedCompanies = [];

    try {
        savedCompanies =
            JSON.parse(
                localStorage.getItem("synvoraCompanies")
            ) || [];
    } catch (error) {
        savedCompanies = [];
    }

    const companyIndex = savedCompanies.findIndex(
        function (company) {
            return company.id === updatedCompany.id;
        }
    );

    if (companyIndex !== -1) {
        savedCompanies[companyIndex] = updatedCompany;

        localStorage.setItem(
            "synvoraCompanies",
            JSON.stringify(savedCompanies)
        );
    }

    try {
        if (typeof companies !== "undefined") {
            companies = savedCompanies;
        }
    } catch (error) {
        /* Company Management is not currently loaded. */
    }

    if (typeof updateActiveCompanyWorkspace === "function") {
        updateActiveCompanyWorkspace();
    }

    if (typeof loadCompanies === "function") {
        loadCompanies();
    }

    loadCompanySettings();

    showCompanySettingsState(
        "✓ Company settings saved successfully.",
        "success"
    );
}


/* RESET UNSAVED CHANGES */

function resetCompanySettings() {
    loadCompanySettings();

    showCompanySettingsState(
        "Unsaved changes have been reset.",
        "ready"
    );
}


/* EXPORT COMPANY DATA */

function exportCompanySettingsData() {
    const company = getActiveSettingsCompany();

    if (!company) {
        showCompanySettingsState(
            "Please select a company first.",
            "error"
        );
        return;
    }

    const fileData = JSON.stringify(company, null, 2);

    const blob = new Blob(
        [fileData],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download =
        (company.name || "synvora-company")
            .replace(/[^a-z0-9]/gi, "-")
            .toLowerCase() +
        "-data.json";

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

    showCompanySettingsState(
        "✓ Company data export has started.",
        "success"
    );
}


/* OPEN COMPANY MANAGEMENT */

function openCompanyManagementFromSettings() {
    document
        .getElementById("company-management-container")
        ?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
}


/* DEACTIVATE COMPANY */

function deactivateActiveCompany() {
    const company = getActiveSettingsCompany();

    if (!company) {
        showCompanySettingsState(
            "Please select a company first.",
            "error"
        );
        return;
    }

    const confirmed = confirm(
        `Deactivate "${company.name}"?`
    );

    if (!confirmed) return;

    const statusField =
        document.getElementById("settingsBusinessStatus");

    if (statusField) {
        statusField.value = "Inactive";
    }

    saveCompanySettings();

    showCompanySettingsState(
        company.name + " is now inactive.",
        "success"
    );
}


/* DELETE ACTIVE COMPANY */

function deleteActiveCompanyFromSettings() {
    const company = getActiveSettingsCompany();

    if (!company) {
        showCompanySettingsState(
            "Please select a company first.",
            "error"
        );
        return;
    }

    const confirmed = confirm(
        `Delete "${company.name}" permanently?`
    );

    if (!confirmed) return;

    let savedCompanies = [];

    try {
        savedCompanies =
            JSON.parse(
                localStorage.getItem("synvoraCompanies")
            ) || [];
    } catch (error) {
        savedCompanies = [];
    }

    savedCompanies = savedCompanies.filter(
        function (item) {
            return item.id !== company.id;
        }
    );

    localStorage.setItem(
        "synvoraCompanies",
        JSON.stringify(savedCompanies)
    );

    localStorage.removeItem("synvoraActiveCompany");

    try {
        if (typeof companies !== "undefined") {
            companies = savedCompanies;
        }
    } catch (error) {
        /* Company Management is not currently loaded. */
    }

    if (typeof updateActiveCompanyWorkspace === "function") {
        updateActiveCompanyWorkspace();
    }

    if (typeof loadCompanies === "function") {
        loadCompanies();
    }

    loadCompanySettings();

    showCompanySettingsState(
        "Company deleted successfully.",
        "success"
    );
}


/* INITIAL LOAD */

function initPremiumCompanySettings() {
    if (!document.getElementById("settingsCompanyName")) {
        setTimeout(initPremiumCompanySettings, 200);
        return;
    }

    loadCompanySettings();
}

setTimeout(initPremiumCompanySettings, 400);