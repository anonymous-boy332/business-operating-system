import { createHmac, timingSafeEqual } from "node:crypto";

export const config = { api: { bodyParser: false } };

function response(res, status, payload) {
    return res.status(status).json(payload);
}

async function readRawBody(req) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;
        if (size > 1024 * 1024) {
            const error = new Error("Webhook payload is too large.");
            error.statusCode = 413;
            throw error;
        }
        chunks.push(buffer);
    }
    return Buffer.concat(chunks);
}

function verifySignature(rawBody, header, secret) {
    const parts = Object.fromEntries(
        String(header || "").split(";").map(part => {
            const separator = part.indexOf("=");
            return separator < 0 ? ["", ""] : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
        }).filter(([key, value]) => key && value)
    );
    const timestamp = Number(parts.ts);
    if (!Number.isInteger(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300 || !parts.h1) return false;

    const expected = createHmac("sha256", secret)
        .update(`${parts.ts}:${rawBody.toString("utf8")}`)
        .digest();
    const signatures = String(header).split(";")
        .filter(part => part.trim().startsWith("h1="))
        .map(part => Buffer.from(part.trim().slice(3), "hex"))
        .filter(signature => signature.length === expected.length);
    return signatures.some(signature => timingSafeEqual(signature, expected));
}

async function rpc(name, payload) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Billing database is not configured.");
    const result = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/${name}`, {
        method: "POST",
        headers: {
            apikey: key,
            authorization: `Bearer ${key}`,
            "content-type": "application/json"
        },
        body: JSON.stringify(payload)
    });
    const content = await result.text();
    if (!result.ok) throw new Error("Verified payment could not be recorded.");
    return content ? JSON.parse(content) : null;
}

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return response(res, 405, { error: "Method not allowed." });
    }

    const secret = process.env.PADDLE_WEBHOOK_SECRET;
    if (!secret) return response(res, 503, { error: "Paddle webhook verification is not configured." });
    try {
        const rawBody = await readRawBody(req);
        const signature = req.headers["paddle-signature"];
        if (!verifySignature(rawBody, signature, secret)) {
            return response(res, 401, { error: "Invalid or expired Paddle signature." });
        }

        const event = JSON.parse(rawBody.toString("utf8"));
        const eventId = String(event.event_id || "");
        const eventType = String(event.event_type || "");
        const data = event.data || {};
        if (!eventId || !eventType) return response(res, 400, { error: "Malformed Paddle event." });

        if (eventType === "subscription.updated" || eventType === "subscription.canceled") {
            const providerStatus = eventType === "subscription.canceled" ? "canceled" : String(data.status || "");
            if (!data.id || !providerStatus) return response(res, 400, { error: "Paddle event is missing subscription status." });
            await rpc("sync_paddle_subscription", {
                p_event_id: eventId,
                p_provider_subscription_id: data.id,
                p_provider_status: providerStatus,
                p_cancel_at_period_end: data.scheduled_change?.action === "cancel",
                p_period_end: data.current_billing_period?.ends_at || null,
                p_paddle_price_id: data.items?.[0]?.price?.id || null,
                p_currency: data.currency_code || null
            });
            return response(res, 200, { received: true });
        }

        if (eventType === "adjustment.created") {
            if (data.action !== "refund" || data.status !== "approved") {
                return response(res, 200, { received: true, processed: false });
            }
            const refundMinorUnits = Number(data.details?.totals?.total);
            if (!data.transaction_id || !data.currency_code || !Number.isFinite(refundMinorUnits)) {
                return response(res, 400, { error: "Paddle refund event has invalid transaction details." });
            }
            await rpc("record_paddle_refund", {
                p_event_id: eventId,
                p_transaction_id: data.transaction_id,
                p_refund_amount: Math.abs(refundMinorUnits) / 100,
                p_currency: data.currency_code
            });
            return response(res, 200, { received: true });
        }

        if (eventType !== "transaction.completed" && eventType !== "transaction.payment_failed" && eventType !== "transaction.past_due") {
            return response(res, 200, { received: true, processed: false });
        }

        const checkoutId = String(data.custom_data?.billing_checkout_id || "");
        const providerSubscriptionId = data.subscription_id || null;
        if (eventType === "transaction.payment_failed" || eventType === "transaction.past_due") {
            if (!checkoutId && !providerSubscriptionId) {
                return response(res, 400, { error: "Paddle payment failure is missing its subscription reference." });
            }
            const transactionId = String(data.id || "");
            if (!transactionId) return response(res, 400, { error: "Paddle event is missing its transaction ID." });
            await rpc("record_paddle_failure", {
                p_event_id: eventId,
                p_checkout_session_id: checkoutId || null,
                p_transaction_id: transactionId,
                p_failure_reason: data.status || "Payment failed.",
                p_provider_subscription_id: providerSubscriptionId
            });
            return response(res, 200, { received: true });
        }

        const currency = String(data.currency_code || "");
        const subtotalMinorUnits = Number(data.details?.totals?.subtotal);
        const totalMinorUnits = Number(data.details?.totals?.total);
        if (!Number.isFinite(subtotalMinorUnits) || subtotalMinorUnits < 0 ||
            !Number.isFinite(totalMinorUnits) || totalMinorUnits < subtotalMinorUnits) {
            return response(res, 400, { error: "Paddle transaction has an invalid total." });
        }
        if (!checkoutId && !providerSubscriptionId) {
            return response(res, 400, { error: "Paddle transaction is missing a billing reference." });
        }

        await rpc("process_paddle_transaction", {
            p_event_id: eventId,
            p_transaction_id: String(data.id || ""),
            p_checkout_session_id: checkoutId || null,
            p_amount: Math.round(subtotalMinorUnits) / 100,
            p_total: Math.round(totalMinorUnits) / 100,
            p_currency: currency,
            p_invoice_number: String(data.invoice_number || data.id),
            p_provider_subscription_id: providerSubscriptionId
        });
        return response(res, 200, { received: true });
    } catch (error) {
        console.error("[paddle webhook]", error instanceof Error ? error.message : "Webhook processing failed.");
        return response(res, error?.statusCode || 500, { error: "Paddle event could not be processed." });
    }
}
