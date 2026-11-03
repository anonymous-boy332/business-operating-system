import { supabase } from "../supabase.js";

const $ = selector => document.querySelector(selector);
const message = $("#billingMessage");
const alerts = $("#billingAlerts");
const adminSection = $("#pricingAdmin");
const retryButton = $("#billingRetry");
const currencyStorageKey = "synvoraBillingCurrency";
let session;
let plans = [];
let billing = null;
let period = "monthly";
let trialDays = 7;

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function displayDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function formatPrice(amount, currency) {
    const value = Number(amount);
    const formatted = new Intl.NumberFormat("en", {
        maximumFractionDigits: 2,
        minimumFractionDigits: value % 1 ? 2 : 0
    }).format(value);
    return currency === "USD" ? `$${formatted}` : `${currency} ${formatted}`;
}

function setMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("is-error", isError);
    message.setAttribute("role", isError ? "alert" : "status");
}

async function billingRequest(url, options = {}) {
    if (window.location.protocol === "file:") {
        throw new Error("Billing API is unavailable when this page is opened as a local file. Run the project with `vercel dev` or open its deployed website URL.");
    }

    let response;
    try {
        response = await fetch(url, options);
    } catch (error) {
        throw new Error("Could not reach the billing API. Check the website connection and confirm the API server is running.");
    }

    const responseText = await response.text();
    let body = null;
    if (responseText) {
        try {
            body = JSON.parse(responseText);
        } catch {
            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error("Billing API returned Forbidden (HTTP 403). Open the deployed website or run it with `vercel dev` so the /api/billing function is available.");
                }
                throw new Error(`Billing API returned an unexpected response (HTTP ${response.status}). Check that the billing API route is deployed.`);
            }
            throw new Error("Billing API returned invalid JSON. Check the API deployment and try again.");
        }
    }
    if (!response.ok) throw new Error(body?.error || `Billing request failed (HTTP ${response.status}).`);
    if (!body || typeof body !== "object") throw new Error("Billing API returned an empty or invalid response.");
    return body;
}

async function apiGet(resource) {
    return billingRequest(`/api/billing?resource=${encodeURIComponent(resource)}`, {
        headers: { authorization: `Bearer ${session.access_token}` }
    });
}

async function apiPost(payload) {
    return billingRequest("/api/billing", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
    });
}

async function perform(payload, successMessage) {
    setMessage("Processing…");
    try {
        await apiPost(payload);
        setMessage(successMessage);
        await loadBilling();
        return true;
    } catch (error) {
        setMessage(error.message, true);
        return false;
    }
}

function renderAlerts() {
    const subscription = billing.subscription;
    const trial = subscription?.trial_records?.[0];
    const items = [];
    if (trial && subscription.status === "trial") {
        const remaining = Math.max(0, Math.ceil((Date.parse(trial.expires_at) - Date.now()) / 86400000));
        items.push(`<div class="billing-alert"><strong>Your free trial ends in ${remaining} day${remaining === 1 ? "" : "s"}.</strong> No payment will be taken automatically. Choose a plan and approve checkout to continue.</div>`);
    } else if (subscription?.status === "expired" && trial) {
        items.push('<div class="billing-alert is-warning"><strong>Your free trial has expired.</strong> Your account was not charged. Choose a plan to continue.</div>');
    } else if (subscription?.status === "past_due") {
        items.push('<div class="billing-alert is-warning"><strong>Payment needs attention.</strong> Your plan may be limited until payment is resolved.</div>');
    }

    for (const event of (billing.events || []).filter(item =>
        ["trial_reminder", "trial_expired", "payment_failed"].includes(item.event_type)
    ).slice(0, 3)) {
        items.push(`<div class="billing-alert is-notice">${escapeHtml(event.description)} <span>${displayDate(event.created_at)}</span></div>`);
    }
    alerts.innerHTML = items.join("");
}

function renderSubscription() {
    const subscription = billing.subscription;
    const plan = subscription?.subscription_plans;
    const trial = subscription?.trial_records?.[0];
    $("#billingPlanName").textContent = plan?.name || "No subscription yet";
    const status = $("#billingStatus");
    status.textContent = subscription?.status ? subscription.status.replace("_", " ") : "No plan";
    status.className = `billing-status billing-status-${subscription?.status || "none"}`;
    $("#billingSummary").innerHTML = subscription ? `
        <div><span>Billing currency</span><strong>${escapeHtml(subscription.currency)}</strong></div>
        <div><span>Billing cycle</span><strong>${escapeHtml(subscription.billing_period)}</strong></div>
        <div><span>Plan price</span><strong>${formatPrice(subscription.price_amount, subscription.currency)} / ${subscription.billing_period === "yearly" ? "year" : "month"}</strong></div>
        <div><span>Next billing date</span><strong>${subscription.status === "trial" ? "Only after you approve payment" : displayDate(subscription.current_period_end)}</strong></div>
        <div><span>Trial expiration</span><strong>${displayDate(trial?.expires_at)}</strong></div>
        <div><span>Cancellation</span><strong>${subscription.cancel_at_period_end ? "Scheduled at period end" : "Not scheduled"}</strong></div>
    ` : '<p>No active subscription. Start a trial or choose a paid plan below.</p>';

    $("#billingCurrency").value = subscription?.currency || localStorage.getItem(currencyStorageKey) || "PKR";
    $("#billingCurrency").disabled = Boolean(subscription && ["active", "past_due", "suspended"].includes(subscription.status));
    $("#billingCancel").hidden = !subscription || !["trial", "active", "past_due", "suspended"].includes(subscription.status) ||
        (subscription.status === "active" && subscription.cancel_at_period_end);
    $("#billingRenew").hidden = !subscription || subscription.status !== "active" || !subscription.cancel_at_period_end;
    $("#saveBillingCurrency").hidden = !subscription || subscription.status !== "trial";
    renderAlerts();
}

function renderPayments() {
    const target = $("#paymentHistory");
    if (!billing.payments.length) {
        target.innerHTML = '<tr><td colspan="5">No payments recorded.</td></tr>';
        return;
    }
    target.innerHTML = billing.payments.map(payment => `
        <tr>
            <td>${displayDate(payment.created_at)}</td>
            <td>${escapeHtml(payment.provider)}</td>
            <td>${escapeHtml(payment.status)}${payment.refunded_amount ? ` · Refunded ${formatPrice(payment.refunded_amount, payment.currency)}` : ""}</td>
            <td>${formatPrice(payment.amount, payment.currency)}</td>
            <td>${escapeHtml(payment.provider_transaction_id || payment.failure_reason || "—")}</td>
        </tr>
    `).join("");
}

function renderInvoices() {
    const target = $("#invoiceHistory");
    if (!billing.invoices.length) {
        target.innerHTML = '<tr><td colspan="5">No invoices recorded.</td></tr>';
        return;
    }
    target.innerHTML = billing.invoices.map(invoice => `
        <tr>
            <td>${escapeHtml(invoice.invoice_number)}</td>
            <td>${displayDate(invoice.issued_at)}</td>
            <td>${escapeHtml(invoice.status)}</td>
            <td>${formatPrice(invoice.amount, invoice.currency)}</td>
            <td><button type="button" class="secondary billing-download" data-invoice-id="${escapeHtml(invoice.id)}">Download</button></td>
        </tr>
    `).join("");
}

function selectedPrice(plan, currency, selectedPeriod) {
    return plan.plan_prices?.find(price =>
        price.currency === currency && price.billing_period === selectedPeriod && price.enabled
    );
}

function renderPlanOptions() {
    const target = $("#billingPlanOptions");
    const current = billing.subscription;
    const currency = $("#billingCurrency").value;
    const available = plans.filter(plan => plan.is_enabled && selectedPrice(plan, currency, period));
    target.innerHTML = available.map(plan => {
        const price = selectedPrice(plan, currency, period);
        const hasCurrent = current && ["trial", "active", "past_due", "suspended"].includes(current.status);
        const currentPlan = hasCurrent && current.plan_id === plan.id && current.billing_period === period;
        const actionText = !hasCurrent
            ? !current && trialDays > 0 ? `Start ${trialDays}-day free trial` : "Choose plan"
            : currentPlan ? "Current plan" : plan.sort_order > (current.subscription_plans?.sort_order || 0) ? "Upgrade plan" : "Change plan";
        const isTrialEligible = !current && !billing.hasTrial && period === "monthly" && trialDays > 0;
        return `
            <article class="price-card${plan.is_popular ? " popular" : ""}">
                ${plan.is_popular ? '<span class="pricing-popular-label">Most Popular</span>' : ""}
                <h3>${escapeHtml(plan.name)}</h3>
                <h4>${formatPrice(price.amount, currency)}<span>/${period === "yearly" ? "year" : "month"}</span></h4>
                <ul class="pricing-feature-list">${(plan.plan_features || []).sort((a, b) => a.position - b.position).map(feature => `<li>${escapeHtml(feature.feature_name)}</li>`).join("")}</ul>
                <ul class="pricing-limit-list">
                    <li>${Number(plan.business_limit) === 0 ? "Unlimited businesses" : `${plan.business_limit} businesses`}</li>
                    <li>${Number(plan.team_member_limit) === 0 ? "Unlimited team members" : `${plan.team_member_limit} team members`}</li>
                    <li>${Number(plan.ai_credit_limit) === 0 ? "Unlimited AI credits" : `${Number(plan.ai_credit_limit).toLocaleString("en")} AI credits`}</li>
                </ul>
                <button type="button" data-plan-action="${escapeHtml(plan.id)}"
                    data-trial="${isTrialEligible}" ${currentPlan ? "disabled" : ""}>${actionText}</button>
            </article>
        `;
    }).join("");
    if (!available.length) target.innerHTML = '<p class="billing-empty">No plans are configured for this currency and billing cycle.</p>';
}

function priceControls(plan = {}) {
    const prices = new Map((plan.plan_prices || []).map(price => [
        `${price.currency}_${price.billing_period}`,
        price
    ]));
    return `
        <div class="admin-price-grid" data-admin-prices>
            ${["PKR", "USD", "AED"].flatMap(currency => ["monthly", "yearly"].map(billingPeriod => {
                const price = prices.get(`${currency}_${billingPeriod}`) || {};
                const key = `${currency}_${billingPeriod}`;
                return `<label>${currency} ${billingPeriod}
                    <input type="number" min="0" step="0.01" required data-price-amount="${key}" value="${escapeHtml(price.amount ?? "")}">
                    <small>Paddle price ID</small>
                    <input type="text" data-paddle-price="${key}" value="${escapeHtml(price.paddle_price_id || "")}">
                    <small>Safepay plan ID</small>
                    <input type="text" data-safepay-price="${key}" value="${escapeHtml(price.safepay_plan_id || "")}">
                </label>`;
            })).join("")}
        </div>
    `;
}

function renderAdminPlans() {
    $("#adminPlanList").innerHTML = plans.map(plan => `
        <form class="admin-plan-form" data-admin-plan-id="${escapeHtml(plan.id)}">
            <h3>Edit ${escapeHtml(plan.name)} ${plan.is_enabled ? "" : "(disabled)"}</h3>
            <div class="admin-form-grid">
                <label>Plan name<input name="name" required maxlength="80" value="${escapeHtml(plan.name)}"></label>
                <label>Slug<input name="slug" required pattern="[a-z0-9-]{2,80}" value="${escapeHtml(plan.slug)}"></label>
                <label>Description<input name="description" maxlength="500" value="${escapeHtml(plan.description)}"></label>
                <label>Sort order<input name="sortOrder" type="number" min="0" required value="${plan.sort_order}"></label>
                <label>Team member limit<input name="teamMemberLimit" type="number" min="0" required value="${plan.team_member_limit}"></label>
                <label>Business limit<input name="businessLimit" type="number" min="0" required value="${plan.business_limit}"></label>
                <label>AI credit limit<input name="aiCreditLimit" type="number" min="0" required value="${plan.ai_credit_limit}"></label>
                <label class="admin-feature-field">Features (one per line)<textarea name="features" rows="5">${escapeHtml((plan.plan_features || []).sort((a, b) => a.position - b.position).map(feature => feature.feature_name).join("\n"))}</textarea></label>
            </div>
            ${priceControls(plan)}
            <label class="admin-checkbox"><input name="isPopular" type="checkbox" ${plan.is_popular ? "checked" : ""}> Mark as Most Popular</label>
            <label class="admin-checkbox"><input name="isEnabled" type="checkbox" ${plan.is_enabled ? "checked" : ""}> Plan enabled</label>
            <button type="submit" class="primary">Save ${escapeHtml(plan.name)}</button>
        </form>
    `).join("");
}

function populatePriceFields(form) {
    const target = form.querySelector("[data-admin-prices]");
    if (target.childElementCount) return;
    target.innerHTML = ["PKR", "USD", "AED"].flatMap(currency => ["monthly", "yearly"].map(periodName => {
        const key = `${currency}_${periodName}`;
        return `<label>${currency} ${periodName}
            <input type="number" min="0" step="0.01" required data-price-amount="${key}">
            <small>Paddle price ID</small>
            <input type="text" data-paddle-price="${key}">
            <small>Safepay plan ID</small>
            <input type="text" data-safepay-price="${key}">
        </label>`;
    })).join("");
}

function adminPlanPayload(form) {
    const values = new FormData(form);
    const features = String(values.get("features") || "").split(/\r?\n/).map(value => value.trim()).filter(Boolean);
    const prices = {};
    for (const input of form.querySelectorAll("[data-price-amount]")) {
        const key = input.dataset.priceAmount;
        prices[key] = {
            amount: input.value,
            paddlePriceId: form.querySelector(`[data-paddle-price="${key}"]`).value,
            safepayPlanId: form.querySelector(`[data-safepay-price="${key}"]`).value
        };
    }
    return {
        id: form.dataset.adminPlanId || undefined,
        name: values.get("name"),
        slug: values.get("slug"),
        description: values.get("description"),
        sortOrder: values.get("sortOrder"),
        teamMemberLimit: values.get("teamMemberLimit"),
        businessLimit: values.get("businessLimit"),
        aiCreditLimit: values.get("aiCreditLimit"),
        isPopular: values.has("isPopular"),
        isEnabled: values.has("isEnabled"),
        features,
        prices
    };
}

function renderAdminSummary(summary) {
    const metrics = [
        ["Active subscriptions", summary.activeSubscriptions],
        ["Expired subscriptions", summary.expiredSubscriptions],
        ...Object.entries(summary.revenues).map(([currency, values]) =>
            [`${currency} MRR`, formatPrice(values.mrr, currency)]
        ),
        ...Object.entries(summary.revenues).map(([currency, values]) =>
            [`${currency} annual recurring revenue`, formatPrice(values.annualRunRate, currency)]
        )
    ];
    $("#adminMetrics").innerHTML = metrics.map(([label, value]) =>
        `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`
    ).join("");
    $("#adminMetrics").insertAdjacentHTML("beforeend", summary.subscribersByPlan.map(item =>
        `<article><span>${escapeHtml(item.planName)} subscribers</span><strong>${item.count}</strong></article>`
    ).join(""));
    $("#adminMetrics").insertAdjacentHTML("beforeend", Object.entries(summary.revenues).map(([currency, values]) =>
        `<article><span>${currency} collected</span><strong>${formatPrice(values.collected, currency)}</strong></article>`
    ).join(""));
    $("#adminSubscribers").innerHTML = (summary.subscribers || []).map(subscriber => `
        <tr>
            <td>${escapeHtml(subscriber.subscription_plans?.name || "—")}</td>
            <td>${escapeHtml(subscriber.customer_id)}</td>
            <td>${escapeHtml(subscriber.status)}</td>
            <td>${escapeHtml(subscriber.currency)}</td>
            <td>${escapeHtml(subscriber.billing_period)}</td>
            <td>${displayDate(subscriber.current_period_end)}</td>
        </tr>
    `).join("") || '<tr><td colspan="6">No subscribers yet.</td></tr>';
}

async function loadAdmin(pricingData) {
    if (!pricingData.isAdmin) return;
    adminSection.hidden = false;
    $("#adminTrialDays").value = pricingData.trialDurationDays;
    const summary = await apiGet("admin");
    renderAdminSummary(summary);
    renderAdminPlans();
    populatePriceFields($("#newPlanForm"));
}

async function loadBilling() {
    const [customerData, pricingData] = await Promise.all([
        apiGet("me"),
        apiGet("plans")
    ]);
    billing = customerData;
    plans = pricingData.plans || [];
    trialDays = pricingData.trialDurationDays;
    renderSubscription();
    renderPayments();
    renderInvoices();
    renderPlanOptions();
    await loadAdmin(pricingData);
}

$("#billingCurrency").addEventListener("change", () => renderPlanOptions());
$("#billingPeriod").addEventListener("change", event => {
    period = event.target.value;
    renderPlanOptions();
});

$("#billingPlanOptions").addEventListener("click", async event => {
    const button = event.target.closest("[data-plan-action]");
    if (!button || button.disabled) return;
    button.disabled = true;
    const payload = {
        action: button.dataset.trial === "true" ? "start_trial" : "checkout",
        planId: button.dataset.planAction,
        currency: $("#billingCurrency").value,
        billingPeriod: period
    };
    if (billing.subscription && payload.action === "checkout" &&
        ["trial", "active", "past_due"].includes(billing.subscription.status)) {
        payload.subscriptionId = billing.subscription.id;
    }
    try {
        const result = await apiPost(payload);
        if (result.checkoutUrl) window.location.assign(result.checkoutUrl);
        else if (result.changeRequested) {
            setMessage("Plan change submitted. Your plan updates after Paddle confirms the subscription change.");
            await loadBilling();
        } else {
            await loadBilling();
            setMessage("Subscription updated.");
        }
    } catch (error) {
        setMessage(error.message, true);
        button.disabled = false;
    }
});

$("#billingCancel").addEventListener("click", () => {
    const confirmation = billing.subscription.status === "trial"
        ? "Cancel your trial? No payment will be taken."
        : "Cancel this subscription at the end of the current billing period?";
    if (!window.confirm(confirmation)) return;
    perform({
        action: "manage",
        operation: "cancel",
        subscriptionId: billing.subscription.id
    }, "Subscription cancellation updated.");
});

$("#billingRenew").addEventListener("click", () => perform({
    action: "manage",
    operation: "renew",
    subscriptionId: billing.subscription.id
}, "Subscription renewal approved."));

$("#saveBillingCurrency").addEventListener("click", async () => {
    const currency = $("#billingCurrency").value;
    const updated = await perform({
        action: "manage",
        operation: "currency",
        currency,
        subscriptionId: billing.subscription.id
    }, "Billing currency updated.");
    if (updated) localStorage.setItem(currencyStorageKey, currency);
});

$("#invoiceHistory").addEventListener("click", async event => {
    const button = event.target.closest("[data-invoice-id]");
    if (!button) return;
    try {
        const result = await billingRequest(`/api/billing?resource=invoice&id=${encodeURIComponent(button.dataset.invoiceId)}`, {
            headers: { authorization: `Bearer ${session.access_token}` }
        });
        const invoice = result.invoice;
        const content = `<!doctype html><html><meta charset="utf-8"><title>Invoice ${escapeHtml(invoice.invoice_number)}</title><body><h1>Synvora AI Invoice</h1><p>Invoice: ${escapeHtml(invoice.invoice_number)}</p><p>Issued: ${escapeHtml(displayDate(invoice.issued_at))}</p><p>Status: ${escapeHtml(invoice.status)}</p><p>Amount: ${escapeHtml(formatPrice(invoice.amount, invoice.currency))}</p><p>Subscription: ${escapeHtml(invoice.subscription_id)}</p></body></html>`;
        const url = URL.createObjectURL(new Blob([content], { type: "text/html;charset=utf-8" }));
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `invoice-${invoice.invoice_number}.html`;
        anchor.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        setMessage(error.message, true);
    }
});

$("#adminPlanList").addEventListener("submit", async event => {
    const form = event.target.closest("[data-admin-plan-id]");
    if (!form) return;
    event.preventDefault();
    try {
        await apiPost({ action: "admin_save_plan", ...adminPlanPayload(form) });
        setMessage("Plan saved.");
        await loadBilling();
    } catch (error) {
        setMessage(error.message, true);
    }
});

$("#newPlanForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
        await apiPost({ action: "admin_save_plan", ...adminPlanPayload(form) });
        form.reset();
        setMessage("Plan created.");
        await loadBilling();
    } catch (error) {
        setMessage(error.message, true);
    }
});

$("#saveTrialDuration").addEventListener("click", async () => {
    try {
        const days = Number($("#adminTrialDays").value);
        await apiPost({ action: "admin_set_trial_duration", days });
        setMessage("Free trial duration updated.");
    } catch (error) {
        setMessage(error.message, true);
    }
});

async function start() {
    retryButton.hidden = true;
    retryButton.disabled = true;
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) {
            window.location.assign("login.html");
            return;
        }
        session = data.session;
        await loadBilling();
        setMessage("");
    } catch (error) {
        console.error("[billing page]", error);
        setMessage(error.message || "Billing details could not be loaded.", true);
        retryButton.hidden = false;
    } finally {
        retryButton.disabled = false;
    }
}

retryButton.addEventListener("click", start);
start();
