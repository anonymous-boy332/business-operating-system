/* =====================================================
   SYNVORA AI - PWA CONTROLLER
   File: js/pwa.js
   Purpose:
   1. Register the service worker.
   2. Handle the browser's install prompt.
   3. Show an install button when supported.
   4. Avoid interfering with existing authentication.
===================================================== */

(function () {
    "use strict";

    let deferredInstallPrompt = null;
    let installButton = null;

    /* ================================================
       CREATE INSTALL BUTTON
       This creates a button only when the browser
       supports the relevant installation flow.
    ================================================ */

    function createInstallButton() {
        if (installButton || !document.body) {
            return;
        }

        installButton = document.createElement("button");

        installButton.type = "button";
        installButton.id = "synvora-pwa-install";
        installButton.textContent = "Install Synvora AI";

        installButton.setAttribute(
            "aria-label",
            "Install Synvora AI app"
        );

        installButton.style.cssText = [
            "position:fixed",
            "right:20px",
            "bottom:20px",
            "z-index:9999",
            "display:none",
            "padding:13px 18px",
            "border:1px solid rgba(0,174,239,.45)",
            "border-radius:12px",
            "background:linear-gradient(135deg,#00AEEF,#70dcff)",
            "color:#020617",
            "font-weight:700",
            "font-size:14px",
            "cursor:pointer",
            "box-shadow:0 8px 28px rgba(0,0,0,.3)"
        ].join(";");

        installButton.addEventListener("click", installApp);

        document.body.appendChild(installButton);
    }

    function addPwaMetadata() {
        if (!document.querySelector('link[rel="manifest"]')) {
            const manifest = document.createElement("link");
            manifest.rel = "manifest";
            manifest.href = "./manifest.json";
            document.head.appendChild(manifest);
        }

        if (!document.querySelector('meta[name="theme-color"]')) {
            const themeColor = document.createElement("meta");
            themeColor.name = "theme-color";
            themeColor.content = "#071a35";
            document.head.appendChild(themeColor);
        }

        if (!document.querySelector('link[rel="apple-touch-icon"]')) {
            const appleIcon = document.createElement("link");
            appleIcon.rel = "apple-touch-icon";
            appleIcon.href = "./icons/icon-192.png";
            document.head.appendChild(appleIcon);
        }
    }

    /* ================================================
       SHOW / HIDE INSTALL BUTTON
    ================================================ */

    function showInstallButton() {
        createInstallButton();

        if (installButton) {
            installButton.style.display = "block";
        }
    }

    function hideInstallButton() {
        if (installButton) {
            installButton.style.display = "none";
        }
    }

    /* ================================================
       INSTALL APPLICATION
    ================================================ */

    async function installApp() {
        if (!deferredInstallPrompt) {
            return;
        }

        deferredInstallPrompt.prompt();

        const result = await deferredInstallPrompt.userChoice;

        if (result && result.outcome === "accepted") {
            hideInstallButton();
        }

        deferredInstallPrompt = null;
    }

    /* ================================================
       CAPTURE BROWSER INSTALL EVENT
    ================================================ */

    window.addEventListener("beforeinstallprompt", function (event) {
        event.preventDefault();

        deferredInstallPrompt = event;

        showInstallButton();
    });

    /* ================================================
       HANDLE SUCCESSFUL INSTALL
    ================================================ */

    window.addEventListener("appinstalled", function () {
        deferredInstallPrompt = null;
        hideInstallButton();

        console.info("Synvora AI PWA installed.");
    });

    /* ================================================
       REGISTER SERVICE WORKER
    ================================================ */

    async function registerServiceWorker() {
        if (!("serviceWorker" in navigator)) {
            console.info(
                "Synvora AI PWA: Service workers are not supported."
            );
            return;
        }

        const isSecureContext =
            window.isSecureContext ||
            location.hostname === "localhost" ||
            location.hostname === "127.0.0.1";

        if (!isSecureContext) {
            console.warn(
                "Synvora AI PWA requires HTTPS or localhost."
            );
            return;
        }

        try {
            const registration =
                await navigator.serviceWorker.register(
                    "./service-worker.js",
                    { scope: "./" }
                );

            console.info(
                "Synvora AI PWA service worker registered.",
                registration.scope
            );
        } catch (error) {
            console.error(
                "Synvora AI PWA service worker registration failed.",
                error
            );
        }
    }

    /* ================================================
       INITIALIZE
    ================================================ */

    function initializePWA() {
        addPwaMetadata();
        registerServiceWorker();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initializePWA,
            { once: true }
        );
    } else {
        initializePWA();
    }

})();