import { supabase } from "../supabase.js";

const settingsStorageKey = "synvoraAccountSettings";
const notificationStorageKey = "synvoraNotificationSettings";
const settingsMessage = document.getElementById("accountSettingsMessage");
const notificationMessage = document.getElementById("notificationSettingsMessage");
const passwordMessage = document.getElementById("passwordMessage");
const workspace = document.querySelector(".ai-workspace");
const language = document.getElementById("settingsLanguage");
const theme = document.getElementById("settingsTheme");
const systemTheme = window.matchMedia("(prefers-color-scheme: light)");
const supportedThemes = new Set(["dark", "light", "system"]);

function readStorage(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || "{}");
        return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch (error) {
        console.error(`[account settings] Could not read ${key}:`, error);
        return {};
    }
}

function showMessage(target, text, isError = false) {
    target.textContent = text;
    target.classList.toggle("is-error", isError);
}

const settings = readStorage(settingsStorageKey);
const notifications = readStorage(notificationStorageKey);
if (language && settings.language) language.value = settings.language;
if (theme) {
    theme.value = supportedThemes.has(settings.theme) ? settings.theme : "dark";
}

function applyTheme(preference) {
    const resolvedTheme = preference === "system"
        ? (systemTheme.matches ? "light" : "dark")
        : preference;
    workspace.dataset.theme = resolvedTheme;
}

if (theme) {
    applyTheme(theme.value);
    theme.addEventListener("change", () => applyTheme(theme.value));
    systemTheme.addEventListener("change", () => {
        if (theme.value === "system") applyTheme("system");
    });
}

for (const [id, key] of [
    ["emailNotifications", "email"],
    ["marketingEmails", "marketing"],
    ["aiUpdates", "ai"]
]) {
    const input = document.getElementById(id);
    if (input && typeof notifications[key] === "boolean") input.checked = notifications[key];
}

document.getElementById("saveAccountSettings").addEventListener("click", () => {
    try {
        localStorage.setItem(settingsStorageKey, JSON.stringify({
            language: language.value,
            theme: theme.value
        }));
        showMessage(settingsMessage, "Your language and theme preferences are saved on this device.");
    } catch (error) {
        console.error("[account settings] Could not save preferences:", error);
        showMessage(settingsMessage, "Settings could not be saved. Check browser storage and try again.", true);
    }
});

document.getElementById("saveNotificationSettings").addEventListener("click", () => {
    try {
        localStorage.setItem(notificationStorageKey, JSON.stringify({
            email: document.getElementById("emailNotifications").checked,
            marketing: document.getElementById("marketingEmails").checked,
            ai: document.getElementById("aiUpdates").checked
        }));
        showMessage(notificationMessage, "Notification preferences saved on this device. Email delivery depends on your account's notification service.");
    } catch (error) {
        console.error("[account settings] Could not save notification preferences:", error);
        showMessage(notificationMessage, "Notification settings could not be saved. Check browser storage and try again.", true);
    }
});

document.getElementById("updatePassword").addEventListener("click", async event => {
    const button = event.currentTarget;
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (!currentPassword || !newPassword) {
        showMessage(passwordMessage, "Enter your current password and a new password.", true);
        return;
    }
    if (newPassword.length < 8) {
        showMessage(passwordMessage, "Your new password must be at least 8 characters.", true);
        return;
    }
    if (newPassword !== confirmPassword) {
        showMessage(passwordMessage, "The new passwords do not match.", true);
        return;
    }

    const originalButtonText = button.textContent;
    button.disabled = true;
    button.textContent = "Updating password...";
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session?.user?.email) {
            window.location.assign("login.html");
            return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: session.user.email,
            password: currentPassword
        });
        if (signInError) throw new Error("Current password is incorrect.");

        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
        if (updateError) throw updateError;

        document.getElementById("currentPassword").value = "";
        document.getElementById("newPassword").value = "";
        document.getElementById("confirmPassword").value = "";
        showMessage(passwordMessage, "Password updated successfully.");
    } catch (error) {
        console.error("[account settings] Password update failed:", error);
        showMessage(passwordMessage, error.message || "Password could not be updated.", true);
    } finally {
        button.disabled = false;
        button.textContent = originalButtonText;
    }
});

document.getElementById("apiKeyHelp").addEventListener("click", event => {
    const instructions = document.getElementById("apiKeyInstructions");
    instructions.hidden = !instructions.hidden;
    event.currentTarget.textContent = instructions.hidden
        ? "Show API setup instructions"
        : "Hide API setup instructions";
    event.currentTarget.setAttribute("aria-expanded", String(!instructions.hidden));
});
