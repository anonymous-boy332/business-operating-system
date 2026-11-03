import { randomUUID } from "node:crypto";

const VALID_CURRENCIES = new Set(["PKR", "USD", "AED"]);
const VALID_PERIODS = new Set(["monthly", "yearly"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function send(res, status, payload) {
    return res.status(status).json(payload);
}

async function updatePaddlePlan(subscription, paddlePriceId) {
    if (!subscription.provider_subscription_id || !paddlePriceId || !process.env.PADDLE_API_KEY) {
        throw new Error("Paddle plan changes are not configured.");
    }
    const environment = process.env.PADDLE_ENVIRONMENT || "sandbox";
    if (!["sandbox", "production"].includes(environment)) throw new Error("PADDLE_ENVIRONMENT must be sandbox or production.");
    const base = environment === "sandbox" ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";
    const response = await fetch(`${base}/subscriptions/${encodeURIComponent(subscription.provider_subscription_id)}`, {
        method: "PATCH",
        headers: {
            authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
            "content-type": "application/json"
        },
        body: JSON.stringify({
            items: [{ price_id: paddlePriceId, quantity: 1 }],
            proration_billing_mode: "do_not_bill",
            scheduled_change: null
        })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result?.error?.detail || "Paddle could not change this plan.");
}

async function updatePaddleSubscription(subscription, operation) {
    if (!subscription.provider_subscription_id || !process.env.PADDLE_API_KEY) {
        throw new Error("Paddle subscription management is not configured.");
    }
    const environment = process.env.PADDLE_ENVIRONMENT || "sandbox";
    if (!["sandbox", "production"].includes(environment)) throw new Error("PADDLE_ENVIRONMENT must be sandbox or production.");
    const base = environment === "sandbox" ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";
    const endpoint = operation === "cancel"
        ? `${base}/subscriptions/${encodeURIComponent(subscription.provider_subscription_id)}/cancel`
        : `${base}/subscriptions/${encodeURIComponent(subscription.provider_subscription_id)}`;
    const response = await fetch(endpoint, {
        method: operation === "cancel" ? "POST" : "PATCH",
        headers: {
            authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
            "content-type": "application/json"
        },
        body: JSON.stringify(operation === "cancel"
            ? { effective_from: "next_billing_period" }
            : { scheduled_change: null })
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result?.error?.detail || "Paddle could not update this subscription.");
    }
}

function configuration() {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
        throw new Error("Billing backend is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    }
    return { url: url.replace(/\/$/, ""), serviceKey };
}

async function database(path, options = {}) {
    const { url, serviceKey } = configuration();
    const response = await fetch(`${url}/rest/v1/${path}`, {
        ...options,
        headers: {
            apikey: serviceKey,
            authorization: `Bearer ${serviceKey}`,
            "content-type": "application/json",
            ...(options.headers || {})
        }
    });
    const text = await response.text();
    let data = null;
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error("Billing database returned an invalid response.");
        }
    }
    if (!response.ok) {
        throw new Error(data?.message || data?.hint || "Billing database request failed.");
    }
    return data;
}

async function rpc(name, payload) {
    return database(`rpc/${name}`, {
        method: "POST",
        body: JSON.stringify(payload)
    });
}

async function authenticatedUser(req) {
    const authorization = req.headers.authorization || "";
    const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return null;

    const { url, serviceKey } = configuration();
    const response = await fetch(`${url}/auth/v1/user`, {
        headers: { apikey: serviceKey, authorization: `Bearer ${token}` }
    });
    if (!response.ok) return null;
    const user = await response.json();
    return user?.id ? user : null;
}

function isAdmin(user) {
    return user?.app_metadata?.role === "super_admin";
}

function requireRecord(value, label) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`${label} is required.`);
    }
    return value;
}

function integerLimit(value, label, max = 10000000) {
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 0 || number > max) {
        throw new Error(`${label} must be a non-negative whole number.`);
    }
    return number;
}

function amountValue(value, label) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0 || amount > 1000000000) {
        throw new Error(`${label} must be a valid non-negative price.`);
    }
    return Math.round(amount * 100) / 100;
}

async function getPlans(includeDisabled = false) {
    const filter = includeDisabled ? "" : "&is_enabled=eq.true";
    return database(
        `subscription_plans?select=id,slug,name,description,is_enabled,is_popular,sort_order,team_member_limit,business_limit,ai_credit_limit,plan_prices(id,currency,billing_period,amount,enabled,paddle_price_id,safepay_plan_id),plan_features(id,feature_name,position)&order=sort_order.asc${filter}`
    );
}

async function getPricing(includeDisabled = false) {
    const [plans, settings] = await Promise.all([
        getPlans(includeDisabled),
        database("billing_settings?select=trial_duration_days&id=eq.true&limit=1")
    ]);
    return {
        plans,
        trialDurationDays: Number(settings?.[0]?.trial_duration_days ?? 7)
    };
}

async function getCustomerBilling(userId) {
    const subscriptionRows = await database(
        `subscriptions?select=*,subscription_plans(name,slug,sort_order,team_member_limit,business_limit,ai_credit_limit),trial_records(started_at,expires_at,reminder_sent_at,expired_notified_at)&customer_id=eq.${userId}&order=created_at.desc&limit=1`
    );
    const [payments, invoices, events, history, trialRows] = await Promise.all([
        database(`payments?select=id,provider,status,currency,amount,provider_transaction_id,failure_reason,refunded_amount,refunded_at,created_at&customer_id=eq.${userId}&order=created_at.desc&limit=50`),
        database(`invoices?select=id,invoice_number,status,currency,amount,issued_at&customer_id=eq.${userId}&order=issued_at.desc&limit=50`),
        database(`subscription_events?select=id,event_type,description,created_at&customer_id=eq.${userId}&order=created_at.desc&limit=30`),
        database(`billing_history?select=id,entry_type,currency,amount,description,created_at&customer_id=eq.${userId}&order=created_at.desc&limit=50`),
        database(`trial_records?select=id&customer_id=eq.${userId}&limit=1`)
    ]);

    const subscription = subscriptionRows?.[0] || null;
    if (subscription?.status === "trial" && subscription.trial_ends_at && Date.parse(subscription.trial_ends_at) <= Date.now()) {
        await database(`subscriptions?id=eq.${subscription.id}&customer_id=eq.${userId}`, {
            method: "PATCH",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({ status: "expired" })
        });
        subscription.status = "expired";
    }

    return { subscription, payments, invoices, events, history, hasTrial: Boolean(trialRows?.length) };
}

async function createCheckout(user, body) {
    if (!user.email_confirmed_at && !user.confirmed_at) {
        throw new Error("Verify your email address before starting checkout.");
    }
    const planId = String(body.planId || "");
    const currency = String(body.currency || "");
    const period = String(body.billingPeriod || "");
    if (!UUID_PATTERN.test(planId) || !VALID_CURRENCIES.has(currency) || !VALID_PERIODS.has(period)) {
        throw new Error("Choose a valid plan, currency, and billing period.");
    }

    let currentSubscription = null;
    if (body.subscriptionId) {
        if (!UUID_PATTERN.test(String(body.subscriptionId))) {
            throw new Error("Choose a valid subscription.");
        }
        const owned = await database(
            `subscriptions?select=id,status,plan_id,currency,provider,provider_subscription_id&customer_id=eq.${user.id}&id=eq.${body.subscriptionId}&limit=1`
        );
        currentSubscription = owned?.[0] || null;
        if (!currentSubscription || !["trial", "active", "past_due"].includes(currentSubscription.status)) {
            throw new Error("This subscription cannot be changed.");
        }
        if (currentSubscription.status === "past_due") throw new Error("Resolve the overdue payment before changing plans.");
    } else {
        const owned = await database(
            `subscriptions?select=id,status,plan_id,currency,provider,provider_subscription_id&customer_id=eq.${user.id}&status=in.(trial,active,past_due,suspended)&order=created_at.desc&limit=1`
        );
        currentSubscription = owned?.[0] || null;
        if (currentSubscription?.status === "past_due") throw new Error("Resolve the overdue payment before changing plans.");
        if (currentSubscription?.status === "suspended") throw new Error("This subscription is suspended and cannot be changed here.");
    }

    const prices = await database(
        `plan_prices?select=id,amount,paddle_price_id,safepay_plan_id&plan_id=eq.${planId}&currency=eq.${currency}&billing_period=eq.${period}&enabled=eq.true&subscription_plans!inner(is_enabled)&subscription_plans.is_enabled=eq.true&limit=1`
    );
    const price = prices?.[0];
    if (!price) throw new Error("The selected price is not available.");

    if (currentSubscription?.status === "active") {
        if (currentSubscription.provider !== "paddle" || !currentSubscription.provider_subscription_id) {
            throw new Error("Plan changes are not configured for this payment provider.");
        }
        if (currentSubscription.currency !== currency) {
            throw new Error("Billing currency cannot be changed on an active subscription.");
        }
        await updatePaddlePlan(currentSubscription, price.paddle_price_id);
        return { changeRequested: true, provider: "paddle" };
    }

    if (currency === "PKR") {
        if (!process.env.SAFEPAY_API_KEY || !process.env.SAFEPAY_WEBHOOK_SECRET) {
            throw new Error("Safepay sandbox credentials and verified webhook configuration are required before checkout.");
        }
        throw new Error("Safepay checkout is disabled until its merchant-approved checkout and signature-verification adapter is configured.");
    }

    const environment = process.env.PADDLE_ENVIRONMENT || "sandbox";
    if (!["sandbox", "production"].includes(environment)) throw new Error("PADDLE_ENVIRONMENT must be sandbox or production.");
    const paddlePriceId = price.paddle_price_id;
    const paddleApiKey = process.env.PADDLE_API_KEY;
    if (!paddlePriceId || !paddleApiKey || !process.env.PADDLE_WEBHOOK_SECRET) {
        throw new Error("Paddle checkout is unavailable until an approved catalog price, API key, and webhook secret are configured.");
    }

    await database(`checkout_sessions?customer_id=eq.${user.id}&status=eq.pending&expires_at=lte.${encodeURIComponent(new Date().toISOString())}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status: "expired" })
    });
    const checkoutSessionId = randomUUID();
    await database("checkout_sessions", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
            id: checkoutSessionId,
            customer_id: user.id,
            subscription_id: currentSubscription?.id || null,
            plan_id: planId,
            provider: "paddle",
            currency,
            billing_period: period,
            amount: price.amount
        })
    });

    const apiBase = environment === "sandbox" ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";
    const savedCustomers = await database(
        `subscriptions?select=provider_customer_id&customer_id=eq.${user.id}&provider_customer_id=not.is.null&order=created_at.desc&limit=1`
    );
    const savedCheckouts = savedCustomers?.length ? [] : await database(
        `checkout_sessions?select=provider_customer_id&customer_id=eq.${user.id}&provider_customer_id=not.is.null&order=created_at.desc&limit=1`
    );
    let paddleCustomerId = savedCustomers?.[0]?.provider_customer_id || savedCheckouts?.[0]?.provider_customer_id;
    if (!paddleCustomerId) {
        const customerResponse = await fetch(`${apiBase}/customers`, {
            method: "POST",
            headers: {
                authorization: `Bearer ${paddleApiKey}`,
                "content-type": "application/json"
            },
            body: JSON.stringify({
                email: user.email,
                name: user.user_metadata?.full_name || undefined,
                external_id: user.id
            })
        });
        const customerResult = await customerResponse.json();
        paddleCustomerId = customerResult?.data?.id;
        if (!customerResponse.ok || !paddleCustomerId) {
            throw new Error(customerResult?.error?.detail || "Paddle customer setup failed.");
        }
    }
    await database(`checkout_sessions?id=eq.${checkoutSessionId}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ provider_customer_id: paddleCustomerId })
    });

    const transactionResponse = await fetch(`${apiBase}/transactions`, {
        method: "POST",
        headers: {
            authorization: `Bearer ${paddleApiKey}`,
            "content-type": "application/json"
        },
        body: JSON.stringify({
            items: [{ price_id: paddlePriceId, quantity: 1 }],
            customer_id: paddleCustomerId,
            collection_mode: "automatic",
            enable_checkout: true,
            custom_data: { billing_checkout_id: checkoutSessionId }
        })
    });
    const transactionResult = await transactionResponse.json();
    const checkoutUrl = transactionResult?.data?.checkout?.url;
    if (!transactionResponse.ok || !checkoutUrl) {
        await database(`checkout_sessions?id=eq.${checkoutSessionId}`, {
            method: "PATCH",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({ status: "failed" })
        });
        throw new Error(transactionResult?.error?.detail || "Paddle did not return a secure checkout URL.");
    }

    await database(`checkout_sessions?id=eq.${checkoutSessionId}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ provider_transaction_id: transactionResult.data.id })
    });
    return {
        checkoutUrl,
        checkoutSessionId,
        provider: "paddle",
        environment,
    };
}

function planInput(body) {
    const name = String(body.name || "").trim();
    const slug = String(body.slug || "").trim().toLowerCase();
    const features = body.features;
    const prices = body.prices;
    if (name.length < 2 || name.length > 80 || !/^[a-z0-9-]{2,80}$/.test(slug)) {
        throw new Error("Enter a plan name and a valid plan slug.");
    }
    if (!Array.isArray(features) || features.length > 60) throw new Error("Add up to 60 plan features.");
    if (!prices || typeof prices !== "object") throw new Error("Configure plan prices.");
    const configuredPrices = [];
    for (const currency of VALID_CURRENCIES) {
        for (const billingPeriod of VALID_PERIODS) {
            const key = `${currency}_${billingPeriod}`;
            const value = prices[key];
            if (!value || typeof value !== "object") throw new Error(`Configure ${key} pricing.`);
            configuredPrices.push({
                currency,
                billing_period: billingPeriod,
                amount: amountValue(value.amount, key),
                enabled: value.enabled !== false,
                paddle_price_id: String(value.paddlePriceId || "").trim() || null,
                safepay_plan_id: String(value.safepayPlanId || "").trim() || null
            });
        }
    }
    const cleanedFeatures = features.map((feature, index) => {
        const featureName = String(feature || "").trim();
        if (!featureName || featureName.length > 160) throw new Error("Plan features must be 1–160 characters.");
        return { feature_name: featureName, position: index + 1 };
    });

    return {
        plan: {
            slug,
            name,
            description: String(body.description || "").trim().slice(0, 500),
            is_enabled: body.isEnabled !== false,
            is_popular: body.isPopular === true,
            sort_order: integerLimit(body.sortOrder ?? 0, "Sort order", 10000),
            team_member_limit: integerLimit(body.teamMemberLimit, "Team member limit"),
            business_limit: integerLimit(body.businessLimit, "Business limit"),
            ai_credit_limit: integerLimit(body.aiCreditLimit, "AI credit limit")
        },
        configuredPrices,
        cleanedFeatures
    };
}

async function savePlan(body) {
    const normalized = planInput(body);
    if (body.id && !UUID_PATTERN.test(String(body.id))) throw new Error("Choose a valid plan.");
    const id = await rpc("admin_save_plan", {
        p_plan_id: body.id ? String(body.id) : null,
        p_plan: normalized.plan,
        p_prices: normalized.configuredPrices,
        p_features: normalized.cleanedFeatures
    });
    if (!id) throw new Error("The plan could not be saved.");
    return { id };
}

async function adminSummary() {
    const [summary, subscribers] = await Promise.all([
        rpc("get_billing_admin_summary", {}),
        database("subscriptions?select=id,customer_id,plan_id,status,currency,billing_period,price_amount,created_at,current_period_end,subscription_plans(name)&order=created_at.desc&limit=1000")
    ]);
    return { ...summary, subscribers };
}

export default async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    try {
        if (req.method === "GET") {
            const resource = String(req.query?.resource || "plans");
            if (resource === "plans") {
                const user = await authenticatedUser(req);
                return send(res, 200, { ...(await getPricing(Boolean(user && isAdmin(user)))), isAdmin: isAdmin(user) });
            }

            const user = await authenticatedUser(req);
            if (!user) return send(res, 401, { error: "Sign in to view billing information." });
            if (resource === "me") return send(res, 200, await getCustomerBilling(user.id));
            if (resource === "admin") {
                if (!isAdmin(user)) return send(res, 403, { error: "Super Admin access is required." });
                return send(res, 200, await adminSummary());
            }
            if (resource === "invoice") {
                const invoiceId = String(req.query?.id || "");
                if (!UUID_PATTERN.test(invoiceId)) return send(res, 400, { error: "Choose a valid invoice." });
                const invoice = await database(
                    `invoices?select=invoice_number,status,currency,amount,issued_at,subscription_id,payments(provider,provider_transaction_id)&customer_id=eq.${user.id}&id=eq.${encodeURIComponent(invoiceId)}&limit=1`
                );
                if (!invoice?.length) return send(res, 404, { error: "Invoice not found." });
                return send(res, 200, { invoice: invoice[0] });
            }
            return send(res, 400, { error: "Unknown billing resource." });
        }

        if (req.method !== "POST") {
            res.setHeader("Allow", "GET, POST");
            return send(res, 405, { error: "Method not allowed." });
        }

        const user = await authenticatedUser(req);
        if (!user) return send(res, 401, { error: "Sign in to manage your subscription." });
        const body = requireRecord(req.body, "Request body");
        const action = String(body.action || "");

        if (action === "start_trial") {
            if (!UUID_PATTERN.test(String(body.planId || "")) ||
                !VALID_CURRENCIES.has(body.currency) || !VALID_PERIODS.has(body.billingPeriod)) {
                return send(res, 400, { error: "Choose a valid plan, currency, and billing period." });
            }
            const subscription = await rpc("start_subscription_trial", {
                p_customer_id: user.id,
                p_plan_id: body.planId,
                p_currency: body.currency,
                p_billing_period: body.billingPeriod
            });
            return send(res, 201, { subscription });
        }

        if (action === "manage") {
            if (!UUID_PATTERN.test(String(body.subscriptionId || "")) ||
                !["cancel", "renew", "currency"].includes(body.operation)) {
                return send(res, 400, { error: "Choose a valid subscription action." });
            }
            if (body.operation === "currency" && !VALID_CURRENCIES.has(body.currency)) {
                return send(res, 400, { error: "Choose a supported currency." });
            }
            if (["cancel", "renew"].includes(body.operation)) {
                const owned = await database(
                    `subscriptions?select=id,status,provider,provider_subscription_id,cancel_at_period_end&customer_id=eq.${user.id}&id=eq.${body.subscriptionId}&limit=1`
                );
                const subscription = owned?.[0];
                if (!subscription) return send(res, 404, { error: "Subscription not found." });
                if (subscription.provider === "paddle" && body.operation === "cancel" && !subscription.cancel_at_period_end) {
                    await updatePaddleSubscription(subscription, "cancel");
                } else if (subscription.provider === "paddle" && body.operation === "renew" && subscription.cancel_at_period_end) {
                    await updatePaddleSubscription(subscription, "renew");
                }
            }
            const subscription = await rpc("manage_subscription", {
                p_customer_id: user.id,
                p_subscription_id: body.subscriptionId,
                p_action: body.operation,
                p_currency: body.currency || null
            });
            return send(res, 200, { subscription });
        }

        if (action === "checkout") return send(res, 200, await createCheckout(user, body));

        if (action === "admin_save_plan" || action === "admin_set_trial_duration") {
            if (!isAdmin(user)) return send(res, 403, { error: "Super Admin access is required." });
            if (action === "admin_save_plan") {
                return send(res, 200, await savePlan(body));
            }
            const days = integerLimit(body.days, "Trial duration", 30);
            await database("billing_settings?id=eq.true", {
                method: "PATCH",
                headers: { Prefer: "return=minimal" },
                body: JSON.stringify({ trial_duration_days: days })
            });
            return send(res, 200, { trialDurationDays: days });
        }

        return send(res, 400, { error: "Unknown billing action." });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Billing request failed.";
        const status = /not configured|unavailable until|disabled until/i.test(message) ? 503 : 400;
        console.error("[billing]", message);
        return send(res, status, { error: message });
    }
}
