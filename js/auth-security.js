/* =========================================================
   SYNVORA AI — AUTH SECURITY
   File: js/auth-security.js
   Version: 1.0.0

   PURPOSE:
   1. Check authentication integration status.
   2. Provide a safe authentication helper.
   3. Handle unauthorized UI access.
   4. Prepare for Supabase Auth integration.

   IMPORTANT:
   This file does not replace Supabase authentication.
   Frontend checks are not a substitute for backend security.
========================================================= */

(function () {
    "use strict";

    // Prevent duplicate initialization.
    if (window.SynvoraAuthSecurity) {
        console.warn("Synvora Auth Security is already loaded.");
        return;
    }

    const CONFIG = Object.freeze({
        BACKEND_CONNECTED: false,
        AUTH_PROVIDER: "supabase",
        REQUIRE_AUTH_FOR_PRIVATE_PAGES: true
    });

    // -----------------------------------------------------
    // 1. CHECK SUPABASE CLIENT
    // -----------------------------------------------------

    function getSupabaseClient() {
        const client = window.supabaseClient;

        if (
            client &&
            typeof client.auth?.getSession === "function"
        ) {
            return client;
        }

        return null;
    }

    // -----------------------------------------------------
    // 2. CHECK AUTHENTICATION SESSION
    //
    // Uses the real Supabase session when a client exists.
    // Never treats a localStorage flag as authentication.
    // -----------------------------------------------------

    async function getSessionStatus() {
        const client = getSupabaseClient();

        if (!client) {
            return {
                authenticated: false,
                verified: false,
                status: "backend_not_connected",
                user: null
            };
        }

        try {
            const { data, error } = await client.auth.getSession();

            if (error) {
                return {
                    authenticated: false,
                    verified: false,
                    status: "session_check_failed",
                    user: null
                };
            }

            const session = data?.session;

            if (!session?.user) {
                return {
                    authenticated: false,
                    verified: true,
                    status: "not_authenticated",
                    user: null
                };
            }

            return {
                authenticated: true,
                verified: true,
                status: "authenticated",
                user: {
                    id: session.user.id,
                    email: session.user.email || null
                }
            };

        } catch (error) {
            console.error(
                "Synvora: Unable to check authentication session."
            );

            return {
                authenticated: false,
                verified: false,
                status: "session_check_failed",
                user: null
            };
        }
    }

    // -----------------------------------------------------
    // 3. REQUIRE AUTHENTICATION
    //
    // Call this on private pages after Supabase integration.
    // Redirect only when the authentication check succeeds
    // and confirms that no session exists.
    // -----------------------------------------------------

    async function requireAuthentication(options = {}) {
        const loginUrl = options.loginUrl || "login.html";

        const result = await getSessionStatus();

        if (!result.verified) {
            console.warn(
                "Synvora: Authentication has not been verified.",
                result.status
            );

            return {
                allowed: false,
                reason: result.status,
                user: null
            };
        }

        if (!result.authenticated) {
            window.location.replace(loginUrl);

            return {
                allowed: false,
                reason: "not_authenticated",
                user: null
            };
        }

        return {
            allowed: true,
            reason: "authenticated",
            user: result.user
        };
    }

    // -----------------------------------------------------
    // 4. HANDLE AUTHENTICATION ERRORS
    // -----------------------------------------------------

    function handleAuthError(error) {
        const message =
            typeof error === "string"
                ? error
                : error?.message || "Authentication failed.";

        console.error("Synvora authentication error:", message);

        return {
            success: false,
            message: "Authentication could not be completed."
        };
    }

    // -----------------------------------------------------
    // 5. SIGN OUT
    //
    // Ends the Supabase session when the client is available.
    // -----------------------------------------------------

    async function signOut() {
        const client = getSupabaseClient();

        if (!client) {
            return {
                success: false,
                reason: "backend_not_connected"
            };
        }

        try {
            const { error } = await client.auth.signOut();

            if (error) {
                console.error("Synvora sign-out failed.");

                return {
                    success: false,
                    reason: "sign_out_failed"
                };
            }

            return {
                success: true,
                reason: "signed_out"
            };

        } catch (error) {
            console.error("Synvora sign-out failed.");

            return {
                success: false,
                reason: "sign_out_failed"
            };
        }
    }

    // -----------------------------------------------------
    // 6. PUBLIC API
    // -----------------------------------------------------

    window.SynvoraAuthSecurity = Object.freeze({
        config: CONFIG,
        getSessionStatus,
        requireAuthentication,
        handleAuthError,
        signOut
    });

    console.info(
        "Synvora Auth Security loaded. Backend integration pending."
    );

})();