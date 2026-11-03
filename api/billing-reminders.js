function send(res, status, payload) {
    return res.status(status).json(payload);
}

async function database(path, options = {}) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Billing database is not configured.");
    const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${path}`, {
        ...options,
        headers: {
            apikey: key,
            authorization: `Bearer ${key}`,
            "content-type": "application/json",
            ...(options.headers || {})
        }
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error("Billing reminder database request failed.");
    return data;
}

async function sendEmail(email, daysLeft) {
    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "content-type": "application/json"
        },
        body: JSON.stringify({
            from: process.env.BILLING_FROM_EMAIL,
            to: [email],
            subject: "Your Synvora AI free trial ends soon",
            html: `<p>Your Synvora AI free trial ends in about ${daysLeft} days. No payment will be taken automatically. Choose a subscription and approve checkout to continue using paid features.</p><p><a href="${process.env.APP_URL}/billing.html">Review your billing options</a></p>`
        })
    });
    if (!response.ok) throw new Error("Trial reminder email could not be sent.");
}

export default async function handler(req, res) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return send(res, 405, { error: "Method not allowed." });
    }

    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
        return send(res, 401, { error: "Unauthorized." });
    }

    try {
        const now = new Date();
        const reminderStart = now.toISOString();
        const reminderEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
        const reminders = await database(
            `trial_records?select=id,customer_id,subscription_id,expires_at&reminder_sent_at=is.null&expires_at=gt.${encodeURIComponent(reminderStart)}&expires_at=lte.${encodeURIComponent(reminderEnd)}`
        );

        let emailsSent = 0;
        for (const trial of reminders || []) {
            await database("subscription_events", {
                method: "POST",
                headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
                body: JSON.stringify({
                    customer_id: trial.customer_id,
                    subscription_id: trial.subscription_id,
                    event_type: "trial_reminder",
                    description: "Your free trial ends within 48 hours. No payment will be taken automatically.",
                    provider_event_id: `trial-reminder:${trial.id}`
                })
            });

            if (process.env.RESEND_API_KEY && process.env.BILLING_FROM_EMAIL && process.env.APP_URL) {
                const userResponse = await fetch(
                    `${process.env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/admin/users/${trial.customer_id}`,
                    {
                        headers: {
                            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
                            authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
                        }
                    }
                );
                if (!userResponse.ok) throw new Error("Trial customer contact could not be loaded.");
                const user = await userResponse.json();
                if (user.email) {
                    await sendEmail(user.email, 2);
                    emailsSent += 1;
                }
            }

            await database(`trial_records?id=eq.${trial.id}&reminder_sent_at=is.null`, {
                method: "PATCH",
                headers: { Prefer: "return=minimal" },
                body: JSON.stringify({ reminder_sent_at: new Date().toISOString() })
            });
        }

        const expired = await database(
            `trial_records?select=id,customer_id,subscription_id&expired_notified_at=is.null&expires_at=lte.${encodeURIComponent(now.toISOString())}`
        );
        for (const trial of expired || []) {
            await database(`subscriptions?id=eq.${trial.subscription_id}&status=eq.trial`, {
                method: "PATCH",
                headers: { Prefer: "return=minimal" },
                body: JSON.stringify({ status: "expired" })
            });
            await database("subscription_events", {
                method: "POST",
                headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
                body: JSON.stringify({
                    customer_id: trial.customer_id,
                    subscription_id: trial.subscription_id,
                    event_type: "trial_expired",
                    description: "Your free trial has expired. No payment was taken.",
                    provider_event_id: `trial-expired:${trial.id}`
                })
            });
            await database(`trial_records?id=eq.${trial.id}&expired_notified_at=is.null`, {
                method: "PATCH",
                headers: { Prefer: "return=minimal" },
                body: JSON.stringify({ expired_notified_at: new Date().toISOString() })
            });
        }

        return send(res, 200, {
            remindersProcessed: reminders?.length || 0,
            expirationNotifications: expired?.length || 0,
            emailsSent
        });
    } catch (error) {
        console.error("[billing reminders]", error instanceof Error ? error.message : "Reminder job failed.");
        return send(res, 500, { error: "Billing reminder job failed." });
    }
}
