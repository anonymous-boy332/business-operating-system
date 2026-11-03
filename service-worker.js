/* =====================================================
   SYNVORA AI - PROGRESSIVE WEB APP
   Service Worker
   Version: 1.0.0

   Security:
   - Sensitive business pages are not cached.
   - Supabase and API responses are not cached.
   - Only the offline fallback page is cached.
===================================================== */

"use strict";

const CACHE_NAME = "synvora-pwa-v1";

const OFFLINE_PAGE = "./offline.html";

/* =====================================================
   INSTALL
   Cache only the offline fallback page.
===================================================== */

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            try {
                const cache = await caches.open(CACHE_NAME);

                const response = await fetch(OFFLINE_PAGE, {
                    cache: "reload"
                });

                if (response.ok) {
                    await cache.put(OFFLINE_PAGE, response);
                }

                await self.skipWaiting();

            } catch (error) {
                console.error(
                    "Synvora PWA: Offline page could not be cached.",
                    error
                );

                await self.skipWaiting();
            }
        })()
    );
});

/* =====================================================
   ACTIVATE
   Remove old Synvora PWA caches.
===================================================== */

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const cacheNames = await caches.keys();

            await Promise.all(
                cacheNames.map((cacheName) => {
                    if (
                        cacheName.startsWith("synvora-pwa-") &&
                        cacheName !== CACHE_NAME
                    ) {
                        return caches.delete(cacheName);
                    }

                    return Promise.resolve(false);
                })
            );

            await self.clients.claim();
        })()
    );
});

/* =====================================================
   FETCH
   Never cache business data, authenticated pages,
   Supabase responses, POST requests or API responses.
===================================================== */

self.addEventListener("fetch", (event) => {
    const request = event.request;

    /* Only handle normal GET requests. */
    if (request.method !== "GET") {
        return;
    }

    /* Ignore browser extensions and non-HTTP requests. */
    if (
        !request.url.startsWith("http://") &&
        !request.url.startsWith("https://")
    ) {
        return;
    }

    const requestURL = new URL(request.url);

    /* Never intercept cross-origin requests. */
    if (requestURL.origin !== self.location.origin) {
        return;
    }

    /* Never cache authentication, Supabase or API routes. */
    const pathname = requestURL.pathname.toLowerCase();

    if (
        pathname.includes("/auth/") ||
        pathname.includes("/rest/v1/") ||
        pathname.includes("/storage/v1/") ||
        pathname.includes("/functions/v1/") ||
        pathname.includes("/graphql") ||
        pathname.includes("/api/") ||
        pathname.includes("/login") ||
        pathname.includes("/register") ||
        pathname.includes("/dashboard") ||
        pathname.includes("/business-os") ||
        pathname.includes("/finance") ||
        pathname.includes("/crm") ||
        pathname.includes("/employees") ||
        pathname.includes("/inventory") ||
        pathname.includes("/transactions") ||
        pathname.includes("/expenses") ||
        pathname.includes("/invoices") ||
        pathname.includes("/profile") ||
        pathname.includes("/settings") ||
        pathname.includes("/projects") ||
        pathname.includes("/history")
    ) {
        return;
    }

    /* Only provide the cached offline page for navigation
       when the network request fails. */
    if (request.mode === "navigate") {
        event.respondWith(
            (async () => {
                try {
                    return await fetch(request);
                } catch (error) {
                    const cache = await caches.open(CACHE_NAME);

                    const offlineResponse = await cache.match(
                        OFFLINE_PAGE
                    );

                    if (offlineResponse) {
                        return offlineResponse;
                    }

                    return new Response(
                        "You are offline. Please reconnect to the internet.",
                        {
                            status: 503,
                            headers: {
                                "Content-Type": "text/plain; charset=utf-8"
                            }
                        }
                    );
                }
            })()
        );
    }
});