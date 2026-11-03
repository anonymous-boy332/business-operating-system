import { createServer } from "node:http";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const mimeTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webmanifest": "application/manifest+json",
    ".webp": "image/webp"
};

function loadEnvironment() {
    const file = path.join(root, ".env");
    if (!existsSync(file)) return;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!match || process.env[match[1]]) continue;
        const value = match[2].replace(/^(['"])(.*)\1$/, "$2");
        process.env[match[1]] = value;
    }
}

function sendJson(res, status, payload) {
    res.statusCode = status;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        size += chunk.length;
        if (size > 1024 * 1024) throw Object.assign(new Error("Request body is too large."), { status: 413 });
        chunks.push(chunk);
    }
    if (!size) return {};
    try {
        return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
        throw Object.assign(new Error("Request body must be valid JSON."), { status: 400 });
    }
}

async function handleApi(req, res, requestUrl) {
    const route = requestUrl.pathname.slice("/api/".length);
    if (!/^[a-z0-9-]+$/i.test(route)) {
        return sendJson(res, 404, { error: "API route not found." });
    }
    const modulePath = path.join(root, "api", `${route}.js`);
    if (!existsSync(modulePath) || !statSync(modulePath).isFile()) {
        return sendJson(res, 404, { error: "API route not found." });
    }

    try {
        req.query = Object.fromEntries(requestUrl.searchParams.entries());
        req.body = ["POST", "PUT", "PATCH"].includes(req.method) ? await readJsonBody(req) : {};
        const { default: handler } = await import(pathToFileURL(modulePath).href);
        if (typeof handler !== "function") return sendJson(res, 501, { error: "This API route is not implemented." });

        const response = {
            statusCode: 200,
            status(code) {
                this.statusCode = code;
                return this;
            },
            setHeader(name, value) {
                res.setHeader(name, value);
                return this;
            },
            json(payload) {
                if (!res.writableEnded) sendJson(res, this.statusCode, payload);
                return this;
            }
        };
        await handler(req, response);
        if (!res.writableEnded) sendJson(res, 500, { error: "API route did not return a response." });
    } catch (error) {
        console.error(`[dev server API] ${route}:`, error);
        if (!res.headersSent) sendJson(res, error.status || 500, { error: error.message || "Internal server error." });
        else res.end();
    }
}

function handleStatic(req, res, requestUrl) {
    let pathname;
    try {
        pathname = decodeURIComponent(requestUrl.pathname);
    } catch {
        return sendJson(res, 400, { error: "Invalid URL path." });
    }
    if (pathname === "/") pathname = "/index.html";

    const filePath = path.resolve(root, `.${pathname}`);
    const relative = path.relative(root, filePath);
    if (relative.startsWith("..") || path.isAbsolute(relative) ||
        relative.split(path.sep).some(part => part.startsWith(".")) ||
        relative.split(path.sep).includes("node_modules")) {
        return sendJson(res, 404, { error: "Not found." });
    }

    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
        return sendJson(res, 404, { error: "Page not found." });
    }
    res.statusCode = 200;
    res.setHeader("content-type", mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream");
    res.setHeader("cache-control", "no-store");
    if (req.method === "HEAD") return res.end();
    createReadStream(filePath).on("error", () => {
        if (!res.headersSent) sendJson(res, 500, { error: "Could not read the requested file." });
        else res.destroy();
    }).pipe(res);
}

loadEnvironment();
const server = createServer((req, res) => {
    let requestUrl;
    try {
        requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    } catch {
        return sendJson(res, 400, { error: "Invalid request URL." });
    }

    if (!["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
        res.setHeader("allow", "GET, HEAD, POST, PUT, PATCH, DELETE");
        return sendJson(res, 405, { error: "Method not allowed." });
    }
    if (requestUrl.pathname.startsWith("/api/")) {
        if (req.method === "GET" || req.method === "HEAD" || req.method === "POST") {
            return handleApi(req, res, requestUrl);
        }
        return sendJson(res, 405, { error: "Method not allowed." });
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
        return sendJson(res, 405, { error: "Method not allowed." });
    }
    return handleStatic(req, res, requestUrl);
});

server.listen(port, "127.0.0.1", () => {
    console.log(`Synvora AI is running at http://localhost:${port}`);
    console.log("API integrations use the private environment variables in .env.");
});
