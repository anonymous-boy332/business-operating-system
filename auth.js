import { supabase } from "./supabase.js";

const currentFile = window.location.pathname.split("/").pop().toLowerCase();
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

function showMessage(form, message, isError = false) {
    const target = form?.querySelector("[id$='Message']");
    if (!target) return;
    target.textContent = message;
    target.setAttribute("role", isError ? "alert" : "status");
}

if (loginForm) {
    loginForm.addEventListener("submit", async event => {
        event.preventDefault();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                showMessage(loginForm, error.message, true);
                return;
            }
            window.location.assign("billing.html");
        } catch (error) {
            showMessage(loginForm, error.message || "Sign-in could not be completed.", true);
        }
    });
}

if (registerForm) {
    registerForm.addEventListener("submit", async event => {
        event.preventDefault();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const fullName = document.getElementById("fullName").value.trim();

        if (password.length < 8) {
            showMessage(registerForm, "Use a password with at least 8 characters.", true);
            return;
        }

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: fullName } }
            });

            if (error) {
                showMessage(registerForm, error.message, true);
                return;
            }

            if (!data.session) {
                showMessage(registerForm, "Check your email to confirm your account, then sign in.");
                return;
            }

            window.location.assign("billing.html");
        } catch (error) {
            showMessage(registerForm, error.message || "Account creation could not be completed.", true);
        }
    });
}

if (!loginForm && !registerForm && (currentFile === "login.html" || currentFile === "register.html")) {
    throw new Error("The authentication form could not be initialized.");
}
