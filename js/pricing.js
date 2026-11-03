const currencySelect = document.getElementById("pricingCurrency");
const periodButtons = [...document.querySelectorAll("[data-pricing-period]")];
const plansContainer = document.getElementById("pricingPlans");
const message = document.getElementById("pricingMessage");
const currencyStorageKey = "synvoraBillingCurrency";
const storedCurrency = localStorage.getItem(currencyStorageKey);
let currency = ["PKR", "USD", "AED"].includes(storedCurrency) ? storedCurrency : "PKR";
let period = "monthly";
let plans = [
    {
        id: "starter",
        name: "Starter",
        description: "Core tools to run and understand one business.",
        is_enabled: true,
        is_popular: false,
        team_member_limit: 2,
        business_limit: 1,
        ai_credit_limit: 50,
        plan_prices: [
            { currency: "PKR", billing_period: "monthly", amount: 2999, enabled: true },
            { currency: "PKR", billing_period: "yearly", amount: 29990, enabled: true },
            { currency: "USD", billing_period: "monthly", amount: 19, enabled: true },
            { currency: "USD", billing_period: "yearly", amount: 190, enabled: true },
            { currency: "AED", billing_period: "monthly", amount: 69, enabled: true },
            { currency: "AED", billing_period: "yearly", amount: 690, enabled: true }
        ],
        plan_features: [
            "Business Dashboard", "Basic Analytics", "CRM / Customer Management",
            "Sales & Order Management", "Basic Finance Management", "Basic Reports",
            "Limited AI Credits"
        ].map((feature_name, position) => ({ feature_name, position }))
    },
    {
        id: "professional",
        name: "Professional",
        description: "Advanced operations, analytics, automation, and AI.",
        is_enabled: true,
        is_popular: true,
        team_member_limit: 5,
        business_limit: 1,
        ai_credit_limit: 0,
        plan_prices: [
            { currency: "PKR", billing_period: "monthly", amount: 5999, enabled: true },
            { currency: "PKR", billing_period: "yearly", amount: 59990, enabled: true },
            { currency: "USD", billing_period: "monthly", amount: 39, enabled: true },
            { currency: "USD", billing_period: "yearly", amount: 390, enabled: true },
            { currency: "AED", billing_period: "monthly", amount: 149, enabled: true },
            { currency: "AED", billing_period: "yearly", amount: 1490, enabled: true }
        ],
        plan_features: [
            "Everything in Starter", "Advanced Analytics", "Complete CRM",
            "Finance & Expense Management", "Inventory Management", "Advanced Sales Management",
            "AI Business Assistant", "Automation & Workflows", "Advanced Reports"
        ].map((feature_name, position) => ({ feature_name, position }))
    },
    {
        id: "business-plus",
        name: "Business Plus",
        description: "Premium intelligence and multi-business operations.",
        is_enabled: true,
        is_popular: false,
        team_member_limit: 20,
        business_limit: 0,
        ai_credit_limit: 0,
        plan_prices: [
            { currency: "PKR", billing_period: "monthly", amount: 11999, enabled: true },
            { currency: "PKR", billing_period: "yearly", amount: 119990, enabled: true },
            { currency: "USD", billing_period: "monthly", amount: 79, enabled: true },
            { currency: "USD", billing_period: "yearly", amount: 790, enabled: true },
            { currency: "AED", billing_period: "monthly", amount: 299, enabled: true },
            { currency: "AED", billing_period: "yearly", amount: 2990, enabled: true }
        ],
        plan_features: [
            "Everything in Professional", "Premium AI Assistant", "Advanced Automation",
            "Business Intelligence", "Multiple Businesses / Branches", "Advanced Permissions",
            "Premium Reports", "Priority Support"
        ].map((feature_name, position) => ({ feature_name, position }))
    }
];
let trialDays = 7;
let trialEligible = true;
let usingFallbackPrices = true;

if (currencySelect) currencySelect.value = currency;

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function formatPrice(amount) {
    const formatted = new Intl.NumberFormat("en", {
        maximumFractionDigits: 2,
        minimumFractionDigits: Number(amount) % 1 ? 2 : 0
    }).format(Number(amount));
    if (currency === "USD") return `$${formatted}`;
    return `${currency} ${formatted}`;
}

function priceFor(plan, selectedPeriod) {
    return plan.plan_prices?.find(price =>
        price.currency === currency &&
        price.billing_period === selectedPeriod &&
        price.enabled
    );
}

function yearlySavings(plan) {
    const monthly = priceFor(plan, "monthly");
    const yearly = priceFor(plan, "yearly");
    if (!monthly || !yearly) return "";
    const amountSaved = Number(monthly.amount) * 12 - Number(yearly.amount);
    if (amountSaved <= 0) return "";
    const percent = Math.round(amountSaved / (Number(monthly.amount) * 12) * 1000) / 10;
    return `<p class="pricing-savings">Save ${formatPrice(amountSaved)} per year (${percent}% off)</p>`;
}

function renderPlans() {
    if (!plansContainer) return;
    const visiblePlans = plans.filter(plan => plan.is_enabled && priceFor(plan, period));
    plansContainer.innerHTML = visiblePlans.map(plan => {
        const price = priceFor(plan, period);
        const features = (plan.plan_features || [])
            .slice()
            .sort((first, second) => first.position - second.position)
            .map(feature => `<li>${escapeHtml(feature.feature_name)}</li>`)
            .join("");
        const businesses = Number(plan.business_limit) === 0
            ? "Unlimited Businesses"
            : `${plan.business_limit} ${Number(plan.business_limit) === 1 ? "Business" : "Businesses"}`;
        const teamMembers = Number(plan.team_member_limit) === 0
            ? "Unlimited Team Members"
            : `${plan.team_member_limit} Team Members`;
        const aiCredits = Number(plan.ai_credit_limit) === 0
            ? "Unlimited AI Credits"
            : `${Number(plan.ai_credit_limit).toLocaleString("en")} AI Credits`;
        const limits = [businesses, teamMembers, aiCredits];
        return `
            <article class="price-card${plan.is_popular ? " popular" : ""}">
                ${plan.is_popular ? '<span class="pricing-popular-label">Most Popular</span>' : ""}
                <h3>${escapeHtml(plan.name)}</h3>
                <p class="pricing-description">${escapeHtml(plan.description || "")}</p>
                <h4>${formatPrice(price.amount)}<span>/${period === "yearly" ? "year" : "month"}</span></h4>
                ${period === "yearly" ? yearlySavings(plan) : ""}
                <ul class="pricing-feature-list">${features}</ul>
                <ul class="pricing-limit-list">${limits.map(limit => `<li>${escapeHtml(limit)}</li>`).join("")}</ul>
                ${trialDays > 0 && trialEligible ? `<button type="button" data-trial-plan="${escapeHtml(plan.id)}"${usingFallbackPrices ? " disabled" : ""}>Start ${trialDays}-day free trial</button>` : ""}
                <button type="button" class="pricing-subscribe-button" data-subscribe-plan="${escapeHtml(plan.id)}"${usingFallbackPrices ? " disabled" : ""}>${usingFallbackPrices ? "Payments coming soon" : `Choose ${escapeHtml(plan.name)}`}</button>
            </article>
        `;
    }).join("");

    if (!visiblePlans.length && message) {
        message.textContent = "No active plans are available for this currency and billing period.";
    }
}

async function getSession() {
    const { supabase } = await import("../supabase.js");
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

async function postBilling(payload) {
    const session = await getSession();
    if (!session) {
        window.location.assign("login.html");
        return null;
    }
    const response = await fetch("/api/billing", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Billing request failed.");
    return result;
}

if (currencySelect) {
    currencySelect.addEventListener("change", () => {
        currency = currencySelect.value;
        localStorage.setItem(currencyStorageKey, currency);
        renderPlans();
    });
}

periodButtons.forEach(button => button.addEventListener("click", () => {
    period = button.dataset.pricingPeriod;
    periodButtons.forEach(item => {
        const selected = item === button;
        item.classList.toggle("selected", selected);
        item.setAttribute("aria-pressed", String(selected));
    });
    renderPlans();
}));

plansContainer?.addEventListener("click", async event => {
    const trialButton = event.target.closest("[data-trial-plan]");
    const subscribeButton = event.target.closest("[data-subscribe-plan]");
    if (!trialButton && !subscribeButton) return;

    const button = trialButton || subscribeButton;
    if (usingFallbackPrices || button.disabled) return;
    const planId = button.dataset.trialPlan || button.dataset.subscribePlan;
    button.disabled = true;
    message.textContent = "Processing your request…";
    try {
        if (trialButton) {
            await postBilling({
                action: "start_trial",
                planId,
                currency,
                billingPeriod: period
            });
            window.location.assign("billing.html");
            return;
        }
        const result = await postBilling({
            action: "checkout",
            planId,
            currency,
            billingPeriod: period
        });
        if (result?.checkoutUrl) window.location.assign(result.checkoutUrl);
    } catch (error) {
        message.textContent = error.message;
    } finally {
        button.disabled = false;
    }
});

async function loadPlans() {
    try {
        const response = await fetch("/api/billing?resource=plans");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Pricing could not be loaded.");
        if (!Array.isArray(data.plans)) throw new Error("Pricing response is invalid.");
        plans = data.plans;
        usingFallbackPrices = false;
        trialDays = Number.isInteger(data.trialDurationDays) ? data.trialDurationDays : 7;
        try {
            const session = await getSession();
            if (session) {
                trialEligible = Boolean(session.user?.email_confirmed_at);
                const billingResponse = await fetch("/api/billing?resource=me", {
                    headers: { authorization: `Bearer ${session.access_token}` }
                });
                const billingData = await billingResponse.json();
                if (!billingResponse.ok) throw new Error(billingData.error || "Trial eligibility could not be verified.");
                trialEligible = trialEligible && !billingData.subscription && !billingData.hasTrial;
                if (billingData.subscription && ["PKR", "USD", "AED"].includes(billingData.subscription.currency)) {
                    currency = billingData.subscription.currency;
                    if (currencySelect) currencySelect.value = currency;
                    localStorage.setItem(currencyStorageKey, currency);
                }
            }
        } catch (error) {
            console.error("[pricing] Could not verify trial eligibility:", error);
        }
        renderPlans();
        if (message) message.textContent = plans.length ? "" : "No active plans are currently configured.";
    } catch (error) {
        usingFallbackPrices = true;
        renderPlans();
        if (message) {
            message.textContent = "Database pricing is temporarily unavailable. Showing the standard prices; checkout and trials are disabled until billing is connected.";
        }
        console.error("[pricing] Could not load database prices:", error);
    }
}

renderPlans();
if (message) message.textContent = "Loading current prices…";
loadPlans();
