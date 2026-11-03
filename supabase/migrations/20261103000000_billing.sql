create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.subscription_plans (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
    name text not null check (length(trim(name)) between 2 and 80),
    description text not null default '',
    is_enabled boolean not null default true,
    is_popular boolean not null default false,
    sort_order integer not null default 0,
    team_member_limit integer not null default 1 check (team_member_limit >= 0),
    business_limit integer not null default 1 check (business_limit >= 0),
    ai_credit_limit integer not null default 0 check (ai_credit_limit >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.plan_prices (
    id uuid primary key default gen_random_uuid(),
    plan_id uuid not null references public.subscription_plans(id) on delete cascade,
    currency text not null check (currency in ('PKR', 'USD', 'AED')),
    billing_period text not null check (billing_period in ('monthly', 'yearly')),
    amount numeric(12, 2) not null check (amount >= 0),
    enabled boolean not null default true,
    paddle_price_id text,
    safepay_plan_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (plan_id, currency, billing_period)
);

create table if not exists public.plan_features (
    id uuid primary key default gen_random_uuid(),
    plan_id uuid not null references public.subscription_plans(id) on delete cascade,
    feature_name text not null check (length(trim(feature_name)) between 1 and 160),
    position integer not null default 0,
    created_at timestamptz not null default now(),
    unique (plan_id, feature_name)
);

create table if not exists public.billing_settings (
    id boolean primary key default true check (id),
    trial_duration_days integer not null default 7 check (trial_duration_days between 0 and 30),
    updated_at timestamptz not null default now()
);
insert into public.billing_settings (id, trial_duration_days)
values (true, 7)
on conflict (id) do nothing;

create table if not exists public.subscriptions (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references auth.users(id) on delete restrict,
    plan_id uuid not null references public.subscription_plans(id) on delete restrict,
    status text not null check (status in ('trial', 'active', 'past_due', 'cancelled', 'expired', 'suspended')),
    currency text not null check (currency in ('PKR', 'USD', 'AED')),
    billing_period text not null check (billing_period in ('monthly', 'yearly')),
    price_amount numeric(12, 2) not null check (price_amount >= 0),
    trial_started_at timestamptz,
    trial_ends_at timestamptz,
    current_period_start timestamptz,
    current_period_end timestamptz,
    cancel_at_period_end boolean not null default false,
    cancelled_at timestamptz,
    provider text check (provider in ('safepay', 'paddle')),
    provider_customer_id text,
    provider_subscription_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check ((trial_started_at is null) = (trial_ends_at is null)),
    unique (provider, provider_subscription_id)
);

create table if not exists public.subscription_events (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references auth.users(id) on delete restrict,
    subscription_id uuid references public.subscriptions(id) on delete set null,
    event_type text not null,
    description text not null default '',
    metadata jsonb not null default '{}'::jsonb,
    provider_event_id text unique,
    created_at timestamptz not null default now()
);

create table if not exists public.payments (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references auth.users(id) on delete restrict,
    subscription_id uuid references public.subscriptions(id) on delete restrict,
    provider text not null check (provider in ('safepay', 'paddle')),
    status text not null check (status in ('pending', 'succeeded', 'failed', 'refunded')),
    currency text not null check (currency in ('PKR', 'USD', 'AED')),
    amount numeric(12, 2) not null check (amount >= 0),
    provider_transaction_id text,
    provider_subscription_id text,
    provider_event_id text unique,
    failure_reason text,
    refunded_amount numeric(12, 2) not null default 0 check (refunded_amount >= 0),
    refunded_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (provider, provider_transaction_id)
);

create table if not exists public.invoices (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references auth.users(id) on delete restrict,
    subscription_id uuid not null references public.subscriptions(id) on delete restrict,
    payment_id uuid not null unique references public.payments(id) on delete restrict,
    invoice_number text not null unique,
    status text not null check (status in ('paid', 'partially_refunded', 'refunded', 'void')),
    currency text not null check (currency in ('PKR', 'USD', 'AED')),
    amount numeric(12, 2) not null check (amount >= 0),
    issued_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create table if not exists public.payment_methods (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references auth.users(id) on delete restrict,
    provider text not null check (provider in ('safepay', 'paddle')),
    provider_payment_method_id text not null,
    card_brand text,
    card_last_four text check (card_last_four is null or card_last_four ~ '^[0-9]{4}$'),
    expiry_month smallint check (expiry_month is null or expiry_month between 1 and 12),
    expiry_year smallint,
    is_default boolean not null default false,
    created_at timestamptz not null default now(),
    unique (customer_id, provider, provider_payment_method_id)
);

create table if not exists public.trial_records (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null unique references auth.users(id) on delete restrict,
    subscription_id uuid not null unique references public.subscriptions(id) on delete restrict,
    email_fingerprint text not null unique,
    started_at timestamptz not null,
    expires_at timestamptz not null,
    reminder_sent_at timestamptz,
    expired_notified_at timestamptz,
    created_at timestamptz not null default now(),
    check (expires_at > started_at)
);

create table if not exists public.checkout_sessions (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references auth.users(id) on delete restrict,
    subscription_id uuid references public.subscriptions(id) on delete restrict,
    plan_id uuid not null references public.subscription_plans(id) on delete restrict,
    provider text not null check (provider in ('safepay', 'paddle')),
    provider_customer_id text,
    status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'expired')),
    currency text not null check (currency in ('PKR', 'USD', 'AED')),
    billing_period text not null check (billing_period in ('monthly', 'yearly')),
    amount numeric(12, 2) not null check (amount >= 0),
    provider_transaction_id text unique,
    expires_at timestamptz not null default (now() + interval '30 minutes'),
    created_at timestamptz not null default now()
);

create table if not exists public.billing_history (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references auth.users(id) on delete restrict,
    subscription_id uuid references public.subscriptions(id) on delete set null,
    payment_id uuid references public.payments(id) on delete set null,
    entry_type text not null check (entry_type in ('charge', 'refund', 'trial', 'plan_change', 'cancellation', 'renewal')),
    currency text check (currency is null or currency in ('PKR', 'USD', 'AED')),
    amount numeric(12, 2) not null default 0 check (amount >= 0),
    description text not null default '',
    created_at timestamptz not null default now()
);

create index if not exists subscriptions_customer_created_idx on public.subscriptions (customer_id, created_at desc);
create index if not exists subscriptions_status_period_idx on public.subscriptions (status, current_period_end);
create unique index if not exists subscriptions_one_current_per_customer_idx
    on public.subscriptions (customer_id) where status in ('trial', 'active', 'past_due', 'suspended');
create index if not exists subscription_events_customer_created_idx on public.subscription_events (customer_id, created_at desc);
create index if not exists payments_customer_created_idx on public.payments (customer_id, created_at desc);
create index if not exists invoices_customer_issued_idx on public.invoices (customer_id, issued_at desc);
create index if not exists trial_records_expiration_idx on public.trial_records (expires_at) where reminder_sent_at is null or expired_notified_at is null;
create index if not exists checkout_sessions_customer_created_idx on public.checkout_sessions (customer_id, created_at desc);
create unique index if not exists checkout_sessions_one_pending_per_customer_idx
    on public.checkout_sessions (customer_id) where status = 'pending';
create index if not exists billing_history_customer_created_idx on public.billing_history (customer_id, created_at desc);
create unique index if not exists plan_prices_paddle_price_unique_idx
    on public.plan_prices (paddle_price_id) where paddle_price_id is not null;
create unique index if not exists plan_prices_safepay_plan_unique_idx
    on public.plan_prices (safepay_plan_id) where safepay_plan_id is not null;

create or replace function public.set_billing_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

do $$
declare
    table_name text;
begin
    foreach table_name in array array['subscription_plans', 'plan_prices', 'subscriptions', 'payments'] loop
        execute format('drop trigger if exists set_updated_at on public.%I', table_name);
        execute format(
            'create trigger set_updated_at before update on public.%I for each row execute function public.set_billing_updated_at()',
            table_name
        );
    end loop;
end;
$$;

create or replace function public.start_subscription_trial(
    p_customer_id uuid,
    p_plan_id uuid,
    p_currency text,
    p_billing_period text
)
returns public.subscriptions
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
    v_user_email text;
    v_email_confirmed timestamptz;
    v_trial_days integer;
    v_price numeric(12, 2);
    v_fingerprint text;
    v_subscription public.subscriptions;
begin
    select email, email_confirmed_at into v_user_email, v_email_confirmed
    from auth.users where id = p_customer_id;
    if v_user_email is null or v_email_confirmed is null then
        raise exception 'A verified email address is required to start a trial' using errcode = 'P0001';
    end if;
    if p_currency not in ('PKR', 'USD', 'AED') or p_billing_period not in ('monthly', 'yearly') then
        raise exception 'Unsupported currency or billing period' using errcode = '22023';
    end if;

    select trial_duration_days into v_trial_days from public.billing_settings where id = true;
    if coalesce(v_trial_days, 0) <= 0 then
        raise exception 'Free trials are currently unavailable' using errcode = 'P0001';
    end if;

    select pp.amount into v_price
    from public.plan_prices pp
    join public.subscription_plans sp on sp.id = pp.plan_id
    where pp.plan_id = p_plan_id and pp.currency = p_currency
        and pp.billing_period = p_billing_period and pp.enabled and sp.is_enabled;
    if v_price is null then
        raise exception 'The selected plan price is unavailable' using errcode = 'P0001';
    end if;

    v_fingerprint := encode(extensions.digest(lower(trim(v_user_email)), 'sha256'), 'hex');
    if exists (select 1 from public.trial_records where customer_id = p_customer_id or email_fingerprint = v_fingerprint)
        or exists (select 1 from public.subscriptions where customer_id = p_customer_id)
        or exists (select 1 from public.checkout_sessions where customer_id = p_customer_id and status = 'pending' and expires_at > now()) then
        raise exception 'This account is not eligible for another trial' using errcode = 'P0001';
    end if;

    insert into public.subscriptions (
        customer_id, plan_id, status, currency, billing_period, price_amount,
        trial_started_at, trial_ends_at, current_period_start, current_period_end
    ) values (
        p_customer_id, p_plan_id, 'trial', p_currency, p_billing_period, v_price,
        now(), now() + make_interval(days => v_trial_days), now(), now() + make_interval(days => v_trial_days)
    ) returning * into v_subscription;

    insert into public.trial_records (customer_id, subscription_id, email_fingerprint, started_at, expires_at)
    values (p_customer_id, v_subscription.id, v_fingerprint, v_subscription.trial_started_at, v_subscription.trial_ends_at);

    insert into public.subscription_events (customer_id, subscription_id, event_type, description)
    values (p_customer_id, v_subscription.id, 'trial_started', 'Started a ' || v_trial_days || '-day free trial.');
    insert into public.billing_history (customer_id, subscription_id, entry_type, description)
    values (p_customer_id, v_subscription.id, 'trial', 'Free trial started; no payment method or automatic charge was created.');

    return v_subscription;
end;
$$;

create or replace function public.manage_subscription(
    p_customer_id uuid,
    p_subscription_id uuid,
    p_action text,
    p_currency text default null
)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
    v_subscription public.subscriptions;
begin
    select * into v_subscription
    from public.subscriptions
    where id = p_subscription_id and customer_id = p_customer_id
    for update;
    if not found then
        raise exception 'Subscription not found' using errcode = 'P0002';
    end if;

    if p_action = 'cancel' then
        if v_subscription.status = 'trial' then
            update public.subscriptions set status = 'cancelled', cancelled_at = now(), cancel_at_period_end = false
            where id = v_subscription.id returning * into v_subscription;
        elsif v_subscription.status in ('active', 'past_due', 'suspended') then
            update public.subscriptions set cancel_at_period_end = true, cancelled_at = now()
            where id = v_subscription.id returning * into v_subscription;
        else
            raise exception 'This subscription cannot be cancelled' using errcode = 'P0001';
        end if;
        insert into public.subscription_events (customer_id, subscription_id, event_type, description)
        values (p_customer_id, v_subscription.id, 'cancelled', 'Subscription cancellation requested.');
        insert into public.billing_history (customer_id, subscription_id, entry_type, description)
        values (p_customer_id, v_subscription.id, 'cancellation', 'Subscription cancellation requested.');
    elsif p_action = 'renew' then
        if v_subscription.status <> 'active' or not v_subscription.cancel_at_period_end then
            raise exception 'This subscription is not eligible for renewal' using errcode = 'P0001';
        end if;
        update public.subscriptions set cancel_at_period_end = false, cancelled_at = null
        where id = v_subscription.id returning * into v_subscription;
        insert into public.subscription_events (customer_id, subscription_id, event_type, description)
        values (p_customer_id, v_subscription.id, 'renewed', 'Subscription renewal approved by customer.');
    elsif p_action = 'currency' then
        if p_currency not in ('PKR', 'USD', 'AED')
            or v_subscription.status <> 'trial'
            or exists (select 1 from public.payments where subscription_id = v_subscription.id and status = 'succeeded') then
            raise exception 'Currency can only be changed during an unpaid trial' using errcode = 'P0001';
        end if;
        update public.subscriptions s set
            currency = p_currency,
            price_amount = pp.amount
        from public.plan_prices pp
        where s.id = v_subscription.id and pp.plan_id = s.plan_id
            and pp.currency = p_currency and pp.billing_period = s.billing_period and pp.enabled
        returning s.* into v_subscription;
        if not found then
            raise exception 'A price is not configured for this currency' using errcode = 'P0001';
        end if;
        insert into public.subscription_events (customer_id, subscription_id, event_type, description)
        values (p_customer_id, v_subscription.id, 'currency_changed', 'Subscription billing currency changed to ' || p_currency || '.');
    else
        raise exception 'Unsupported subscription action' using errcode = '22023';
    end if;

    return v_subscription;
end;
$$;

create or replace function public.process_paddle_transaction(
    p_event_id text,
    p_transaction_id text,
    p_checkout_session_id uuid,
    p_amount numeric,
    p_total numeric,
    p_currency text,
    p_invoice_number text,
    p_provider_subscription_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_checkout public.checkout_sessions;
    v_subscription public.subscriptions;
    v_payment public.payments;
    v_existing_payment public.payments;
    v_customer_id uuid;
    v_subscription_id uuid;
    v_plan_id uuid;
    v_currency text;
    v_billing_period text;
    v_amount numeric(12, 2);
    v_start timestamptz;
    v_end timestamptz;
    v_has_pending_checkout boolean := false;
    v_checkout_found boolean := false;
begin
    if exists (select 1 from public.subscription_events where provider_event_id = p_event_id) then
        return jsonb_build_object('duplicate', true);
    end if;
    if p_checkout_session_id is not null then
        select * into v_checkout from public.checkout_sessions
        where id = p_checkout_session_id for update;
        v_checkout_found := found;
    end if;

    if v_checkout_found and v_checkout.provider = 'paddle'
        and ((v_checkout.status = 'pending' and v_checkout.expires_at > now())
            or v_checkout.provider_transaction_id = p_transaction_id) then
        v_has_pending_checkout := true;
        v_customer_id := v_checkout.customer_id;
        v_subscription_id := v_checkout.subscription_id;
        v_plan_id := v_checkout.plan_id;
        v_currency := v_checkout.currency;
        v_billing_period := v_checkout.billing_period;
        v_amount := v_checkout.amount;
    elsif p_provider_subscription_id is not null then
        select * into v_subscription from public.subscriptions
        where provider = 'paddle' and provider_subscription_id = p_provider_subscription_id
        for update;
        if not found then
            raise exception 'Paddle renewal subscription was not found' using errcode = 'P0002';
        end if;
        v_customer_id := v_subscription.customer_id;
        v_subscription_id := v_subscription.id;
        v_plan_id := v_subscription.plan_id;
        v_currency := v_subscription.currency;
        v_billing_period := v_subscription.billing_period;
        v_amount := v_subscription.price_amount;
    else
        raise exception 'Payment does not match a valid checkout' using errcode = 'P0001';
    end if;

    if p_currency <> v_currency or p_amount <> v_amount or p_total is null or p_total < p_amount then
        raise exception 'Payment does not match the configured plan price' using errcode = 'P0001';
    end if;
    if v_subscription_id is not null then
        select * into v_subscription from public.subscriptions
        where id = v_subscription_id and customer_id = v_customer_id for update;
        if not found then
            raise exception 'Subscription not found for checkout' using errcode = 'P0002';
        end if;
    else
        insert into public.subscriptions (
            customer_id, plan_id, status, currency, billing_period, price_amount
        ) values (
            v_customer_id, v_plan_id, 'expired',
            v_currency, v_billing_period, v_amount
        ) returning * into v_subscription;
    end if;

    select * into v_existing_payment from public.payments
    where provider = 'paddle' and provider_transaction_id = p_transaction_id
    for update;
    if found then
        if v_existing_payment.status <> 'failed' or v_existing_payment.customer_id <> v_customer_id
            or v_existing_payment.currency <> p_currency then
            insert into public.subscription_events (customer_id, subscription_id, event_type, provider_event_id, description)
            values (v_customer_id, v_subscription.id, 'duplicate_payment_event', p_event_id, 'Duplicate provider transaction ignored.')
            on conflict (provider_event_id) do nothing;
            return jsonb_build_object('duplicate', true);
        end if;
        update public.payments set
            subscription_id = v_subscription.id, status = 'succeeded', amount = p_total,
            provider_subscription_id = p_provider_subscription_id,
            provider_event_id = p_event_id, failure_reason = null
        where id = v_existing_payment.id returning * into v_payment;
    else
        insert into public.payments (
            customer_id, subscription_id, provider, status, currency, amount,
            provider_transaction_id, provider_subscription_id, provider_event_id
        ) values (
            v_customer_id, v_subscription.id, 'paddle', 'succeeded', p_currency, p_total,
            p_transaction_id, p_provider_subscription_id, p_event_id
        ) returning * into v_payment;
    end if;

    if (v_has_pending_checkout and v_checkout.subscription_id is null)
        or v_subscription.status in ('trial', 'expired', 'cancelled') then
        v_start := now();
    else
        v_start := greatest(coalesce(v_subscription.current_period_end, now()), now());
    end if;
    v_end := case when v_subscription.billing_period = 'yearly'
        then v_start + interval '1 year' else v_start + interval '1 month' end;

    update public.subscriptions set
        plan_id = v_plan_id,
        status = 'active', currency = v_currency, billing_period = v_billing_period,
        price_amount = v_amount, current_period_start = v_start, current_period_end = v_end,
        trial_started_at = null, trial_ends_at = null,
        provider = 'paddle',
        provider_customer_id = coalesce(v_checkout.provider_customer_id, provider_customer_id),
        provider_subscription_id = coalesce(p_provider_subscription_id, provider_subscription_id),
        cancel_at_period_end = false, cancelled_at = null
    where id = v_subscription.id;

    insert into public.invoices (customer_id, subscription_id, payment_id, invoice_number, status, currency, amount)
    values (v_subscription.customer_id, v_subscription.id, v_payment.id, p_invoice_number, 'paid', p_currency, p_total);
    insert into public.billing_history (customer_id, subscription_id, payment_id, entry_type, currency, amount, description)
    values (v_subscription.customer_id, v_subscription.id, v_payment.id, 'charge', p_currency, p_total, 'Verified Paddle payment.');
    insert into public.subscription_events (customer_id, subscription_id, event_type, provider_event_id, description)
    values (v_subscription.customer_id, v_subscription.id, 'payment_succeeded', p_event_id, 'Paddle payment verified and recorded.');
    if v_has_pending_checkout then
        update public.checkout_sessions set status = 'completed', provider_transaction_id = p_transaction_id
        where id = v_checkout.id;
    end if;

    return jsonb_build_object('duplicate', false, 'payment_id', v_payment.id);
end;
$$;

create or replace function public.record_paddle_failure(
    p_event_id text,
    p_checkout_session_id uuid,
    p_transaction_id text,
    p_failure_reason text,
    p_provider_subscription_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_checkout public.checkout_sessions;
    v_subscription public.subscriptions;
    v_customer_id uuid;
    v_subscription_id uuid;
    v_currency text;
    v_amount numeric(12, 2);
    v_checkout_found boolean := false;
begin
    if exists (select 1 from public.subscription_events where provider_event_id = p_event_id) then
        return jsonb_build_object('duplicate', true);
    end if;
    select customer_id, subscription_id into v_customer_id, v_subscription_id
    from public.payments
    where provider = 'paddle' and provider_transaction_id = p_transaction_id;
    if found then
        insert into public.subscription_events (customer_id, subscription_id, event_type, provider_event_id, description)
        values (v_customer_id, v_subscription_id, 'duplicate_payment_failure', p_event_id, 'Duplicate provider payment failure ignored.')
        on conflict (provider_event_id) do nothing;
        return jsonb_build_object('duplicate', true);
    end if;
    if p_checkout_session_id is not null then
        select * into v_checkout from public.checkout_sessions
        where id = p_checkout_session_id for update;
        v_checkout_found := found;
    end if;
    if v_checkout_found and v_checkout.provider = 'paddle' and v_checkout.status = 'pending' then
        v_customer_id := v_checkout.customer_id;
        v_subscription_id := v_checkout.subscription_id;
        v_currency := v_checkout.currency;
        v_amount := v_checkout.amount;
    elsif p_provider_subscription_id is not null then
        select * into v_subscription from public.subscriptions
        where provider = 'paddle' and provider_subscription_id = p_provider_subscription_id
        for update;
        if not found then
            raise exception 'Paddle subscription was not found' using errcode = 'P0002';
        end if;
        v_customer_id := v_subscription.customer_id;
        v_subscription_id := v_subscription.id;
        v_currency := v_subscription.currency;
        v_amount := v_subscription.price_amount;
        update public.subscriptions set status = 'past_due' where id = v_subscription.id;
    else
        raise exception 'Checkout or subscription reference not found' using errcode = 'P0001';
    end if;

    insert into public.payments (
        customer_id, subscription_id, provider, status, currency, amount,
        provider_transaction_id, provider_event_id, failure_reason
    ) values (
        v_customer_id, v_subscription_id,
        'paddle', 'failed', v_currency, v_amount,
        p_transaction_id, p_event_id, left(coalesce(p_failure_reason, 'Payment failed.'), 500)
    );
    if v_checkout.id is not null then
        update public.checkout_sessions set status = 'failed' where id = v_checkout.id;
    end if;
    insert into public.subscription_events (customer_id, subscription_id, event_type, provider_event_id, description)
    values (v_customer_id, v_subscription_id, 'payment_failed', p_event_id, 'Paddle payment failed.');
    return jsonb_build_object('duplicate', false);
end;
$$;

create or replace function public.sync_paddle_subscription(
    p_event_id text,
    p_provider_subscription_id text,
    p_provider_status text,
    p_cancel_at_period_end boolean,
    p_period_end timestamptz,
    p_paddle_price_id text,
    p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_subscription public.subscriptions;
    v_status text;
    v_plan_id uuid;
    v_billing_period text;
    v_amount numeric(12, 2);
    v_currency text;
begin
    if exists (select 1 from public.subscription_events where provider_event_id = p_event_id) then
        return jsonb_build_object('duplicate', true);
    end if;
    select * into v_subscription from public.subscriptions
    where provider = 'paddle' and provider_subscription_id = p_provider_subscription_id
    for update;
    if not found then
        return jsonb_build_object('ignored', true);
    end if;

    v_status := case p_provider_status
        when 'active' then 'active'
        when 'past_due' then 'past_due'
        when 'canceled' then 'cancelled'
        when 'trialing' then 'trial'
        when 'paused' then 'suspended'
        else null
    end;
    if v_status is null then
        raise exception 'Unsupported Paddle subscription status' using errcode = '22023';
    end if;
    if p_paddle_price_id is not null then
        select plan_id, billing_period, amount, currency into v_plan_id, v_billing_period, v_amount, v_currency
        from public.plan_prices
        where paddle_price_id = p_paddle_price_id and enabled;
        if not found or (p_currency is not null and p_currency <> v_currency) then
            raise exception 'Paddle price does not match an enabled plan price' using errcode = 'P0001';
        end if;
    end if;

    update public.subscriptions set
        status = v_status,
        plan_id = coalesce(v_plan_id, plan_id),
        currency = coalesce(v_currency, currency),
        billing_period = coalesce(v_billing_period, billing_period),
        price_amount = coalesce(v_amount, price_amount),
        cancel_at_period_end = coalesce(p_cancel_at_period_end, false),
        current_period_end = coalesce(p_period_end, current_period_end),
        cancelled_at = case when v_status = 'cancelled' then now() when p_cancel_at_period_end then cancelled_at else null end
    where id = v_subscription.id;
    insert into public.subscription_events (customer_id, subscription_id, event_type, provider_event_id, description)
    values (v_subscription.customer_id, v_subscription.id, 'provider_status_updated', p_event_id, 'Paddle subscription status synchronized.');
    return jsonb_build_object('duplicate', false);
end;
$$;

create or replace function public.record_paddle_refund(
    p_event_id text,
    p_transaction_id text,
    p_refund_amount numeric,
    p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_payment public.payments;
    v_total_refunded numeric(12, 2);
begin
    if exists (select 1 from public.subscription_events where provider_event_id = p_event_id) then
        return jsonb_build_object('duplicate', true);
    end if;
    select * into v_payment from public.payments
    where provider = 'paddle' and provider_transaction_id = p_transaction_id
    for update;
    if not found or v_payment.status not in ('succeeded', 'refunded')
        or p_currency <> v_payment.currency or p_refund_amount <= 0 then
        raise exception 'Refund does not match a recorded payment' using errcode = 'P0001';
    end if;

    v_total_refunded := v_payment.refunded_amount + p_refund_amount;
    if v_total_refunded > v_payment.amount then
        raise exception 'Refund exceeds the original payment' using errcode = 'P0001';
    end if;
    update public.payments set
        refunded_amount = v_total_refunded,
        status = case when v_total_refunded = amount then 'refunded' else 'succeeded' end,
        refunded_at = now()
    where id = v_payment.id;
    update public.invoices set
        status = case when v_total_refunded = v_payment.amount then 'refunded' else 'partially_refunded' end
    where payment_id = v_payment.id;
    insert into public.billing_history (
        customer_id, subscription_id, payment_id, entry_type, currency, amount, description
    ) values (
        v_payment.customer_id, v_payment.subscription_id, v_payment.id, 'refund',
        v_payment.currency, p_refund_amount, 'Verified Paddle refund.'
    );
    insert into public.subscription_events (
        customer_id, subscription_id, event_type, provider_event_id, description
    ) values (
        v_payment.customer_id, v_payment.subscription_id, 'refund_recorded', p_event_id, 'Paddle refund verified and recorded.'
    );
    return jsonb_build_object('duplicate', false);
end;
$$;

create or replace function public.get_billing_admin_summary()
returns jsonb
language sql
security definer
set search_path = public
as $$
    select jsonb_build_object(
        'activeSubscriptions', (select count(*) from public.subscriptions where status = 'active'),
        'expiredSubscriptions', (select count(*) from public.subscriptions where status = 'expired'),
        'subscribersByPlan', coalesce((
            select jsonb_agg(jsonb_build_object(
                'planId', p.id,
                'planName', p.name,
                'count', (select count(*) from public.subscriptions s
                    where s.plan_id = p.id and s.status in ('trial', 'active', 'past_due'))
            ) order by p.sort_order)
            from public.subscription_plans p
        ), '[]'::jsonb),
        'revenues', (
            select jsonb_object_agg(currencies.code, jsonb_build_object(
                'mrr', coalesce((
                    select sum(case when s.billing_period = 'yearly' then s.price_amount / 12 else s.price_amount end)
                    from public.subscriptions s where s.status = 'active' and s.currency = currencies.code
                ), 0),
                'annualRunRate', coalesce((
                    select sum(case when s.billing_period = 'yearly' then s.price_amount else s.price_amount * 12 end)
                    from public.subscriptions s where s.status = 'active' and s.currency = currencies.code
                ), 0),
                'collected', coalesce((
                    select sum(p.amount) from public.payments p where p.status = 'succeeded' and p.currency = currencies.code
                ), 0)
            ))
            from unnest(array['PKR', 'USD', 'AED']) as currencies(code)
        )
    );
$$;

create or replace function public.admin_save_plan(
    p_plan_id uuid,
    p_plan jsonb,
    p_prices jsonb,
    p_features jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_plan_id uuid;
begin
    if p_plan_id is null then
        insert into public.subscription_plans (
            slug, name, description, is_enabled, is_popular, sort_order,
            team_member_limit, business_limit, ai_credit_limit
        ) values (
            p_plan->>'slug', p_plan->>'name', coalesce(p_plan->>'description', ''),
            (p_plan->>'is_enabled')::boolean, (p_plan->>'is_popular')::boolean,
            (p_plan->>'sort_order')::integer, (p_plan->>'team_member_limit')::integer,
            (p_plan->>'business_limit')::integer, (p_plan->>'ai_credit_limit')::integer
        ) returning id into v_plan_id;
    else
        update public.subscription_plans set
            slug = p_plan->>'slug',
            name = p_plan->>'name',
            description = coalesce(p_plan->>'description', ''),
            is_enabled = (p_plan->>'is_enabled')::boolean,
            is_popular = (p_plan->>'is_popular')::boolean,
            sort_order = (p_plan->>'sort_order')::integer,
            team_member_limit = (p_plan->>'team_member_limit')::integer,
            business_limit = (p_plan->>'business_limit')::integer,
            ai_credit_limit = (p_plan->>'ai_credit_limit')::integer
        where id = p_plan_id returning id into v_plan_id;
        if v_plan_id is null then
            raise exception 'Plan not found' using errcode = 'P0002';
        end if;
    end if;

    delete from public.plan_prices where plan_id = v_plan_id;
    insert into public.plan_prices (plan_id, currency, billing_period, amount, enabled, paddle_price_id, safepay_plan_id)
    select v_plan_id, price.currency, price.billing_period, price.amount,
        coalesce(price.enabled, true), price.paddle_price_id, price.safepay_plan_id
    from jsonb_to_recordset(p_prices) as price(
        currency text, billing_period text, amount numeric, enabled boolean,
        paddle_price_id text, safepay_plan_id text
    );

    delete from public.plan_features where plan_id = v_plan_id;
    insert into public.plan_features (plan_id, feature_name, position)
    select v_plan_id, feature.feature_name, feature.position
    from jsonb_to_recordset(p_features) as feature(feature_name text, position integer);
    return v_plan_id;
end;
$$;

alter table public.subscription_plans enable row level security;
alter table public.plan_prices enable row level security;
alter table public.plan_features enable row level security;
alter table public.billing_settings enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_events enable row level security;
alter table public.payments enable row level security;
alter table public.invoices enable row level security;
alter table public.payment_methods enable row level security;
alter table public.trial_records enable row level security;
alter table public.checkout_sessions enable row level security;
alter table public.billing_history enable row level security;

create policy "Public can read enabled plans" on public.subscription_plans
    for select to anon, authenticated using (is_enabled);
create policy "Public can read enabled plan prices" on public.plan_prices
    for select to anon, authenticated using (
        enabled and exists (select 1 from public.subscription_plans p where p.id = plan_id and p.is_enabled)
    );
create policy "Public can read features for enabled plans" on public.plan_features
    for select to anon, authenticated using (
        exists (select 1 from public.subscription_plans p where p.id = plan_id and p.is_enabled)
    );
create policy "Customers can read own subscriptions" on public.subscriptions
    for select to authenticated using (customer_id = auth.uid());
create policy "Customers can read own events" on public.subscription_events
    for select to authenticated using (customer_id = auth.uid());
create policy "Customers can read own payments" on public.payments
    for select to authenticated using (customer_id = auth.uid());
create policy "Customers can read own invoices" on public.invoices
    for select to authenticated using (customer_id = auth.uid());
create policy "Customers can read own payment methods" on public.payment_methods
    for select to authenticated using (customer_id = auth.uid());
create policy "Customers can read own trial records" on public.trial_records
    for select to authenticated using (customer_id = auth.uid());
create policy "Customers can read own checkout sessions" on public.checkout_sessions
    for select to authenticated using (customer_id = auth.uid());
create policy "Customers can read own billing history" on public.billing_history
    for select to authenticated using (customer_id = auth.uid());

revoke all on public.billing_settings from anon, authenticated;
revoke all on function public.start_subscription_trial(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.manage_subscription(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.process_paddle_transaction(text, text, uuid, numeric, numeric, text, text, text) from public, anon, authenticated;
revoke all on function public.record_paddle_failure(text, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.sync_paddle_subscription(text, text, text, boolean, timestamptz, text, text) from public, anon, authenticated;
revoke all on function public.record_paddle_refund(text, text, numeric, text) from public, anon, authenticated;
revoke all on function public.get_billing_admin_summary() from public, anon, authenticated;
revoke all on function public.admin_save_plan(uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.start_subscription_trial(uuid, uuid, text, text) to service_role;
grant execute on function public.manage_subscription(uuid, uuid, text, text) to service_role;
grant execute on function public.process_paddle_transaction(text, text, uuid, numeric, numeric, text, text, text) to service_role;
grant execute on function public.record_paddle_failure(text, uuid, text, text, text) to service_role;
grant execute on function public.sync_paddle_subscription(text, text, text, boolean, timestamptz, text, text) to service_role;
grant execute on function public.record_paddle_refund(text, text, numeric, text) to service_role;
grant execute on function public.get_billing_admin_summary() to service_role;
grant execute on function public.admin_save_plan(uuid, jsonb, jsonb, jsonb) to service_role;

insert into public.subscription_plans (
    slug, name, description, is_enabled, is_popular, sort_order,
    team_member_limit, business_limit, ai_credit_limit
) values
    ('starter', 'Starter', 'Core tools to run and understand one business.', true, false, 1, 2, 1, 50),
    ('professional', 'Professional', 'Advanced operations, analytics, automation, and AI.', true, true, 2, 5, 1, 0),
    ('business-plus', 'Business Plus', 'Premium intelligence and multi-business operations.', true, false, 3, 20, 0, 0)
on conflict (slug) do update set
    name = excluded.name,
    description = excluded.description,
    is_popular = excluded.is_popular,
    sort_order = excluded.sort_order,
    team_member_limit = excluded.team_member_limit,
    business_limit = excluded.business_limit,
    ai_credit_limit = excluded.ai_credit_limit;

insert into public.plan_prices (plan_id, currency, billing_period, amount)
select p.id, prices.currency, prices.billing_period, prices.amount
from public.subscription_plans p
join (values
    ('starter', 'PKR', 'monthly', 2999), ('starter', 'PKR', 'yearly', 29990),
    ('starter', 'USD', 'monthly', 19), ('starter', 'USD', 'yearly', 190),
    ('starter', 'AED', 'monthly', 69), ('starter', 'AED', 'yearly', 690),
    ('professional', 'PKR', 'monthly', 5999), ('professional', 'PKR', 'yearly', 59990),
    ('professional', 'USD', 'monthly', 39), ('professional', 'USD', 'yearly', 390),
    ('professional', 'AED', 'monthly', 149), ('professional', 'AED', 'yearly', 1490),
    ('business-plus', 'PKR', 'monthly', 11999), ('business-plus', 'PKR', 'yearly', 119990),
    ('business-plus', 'USD', 'monthly', 79), ('business-plus', 'USD', 'yearly', 790),
    ('business-plus', 'AED', 'monthly', 299), ('business-plus', 'AED', 'yearly', 2990)
) as prices(slug, currency, billing_period, amount) on prices.slug = p.slug
on conflict (plan_id, currency, billing_period) do update set amount = excluded.amount, enabled = true;

insert into public.plan_features (plan_id, feature_name, position)
select p.id, features.feature_name, features.position
from public.subscription_plans p
join (values
    ('starter', 'Business Dashboard', 1),
    ('starter', 'Basic Analytics', 2),
    ('starter', 'CRM / Customer Management', 3),
    ('starter', 'Sales & Order Management', 4),
    ('starter', 'Basic Finance Management', 5),
    ('starter', 'Basic Reports', 6),
    ('starter', 'Limited AI Credits', 7),
    ('professional', 'Everything in Starter', 1),
    ('professional', 'Advanced Analytics', 2),
    ('professional', 'Complete CRM', 3),
    ('professional', 'Finance & Expense Management', 4),
    ('professional', 'Inventory Management', 5),
    ('professional', 'Advanced Sales Management', 6),
    ('professional', 'AI Business Assistant', 7),
    ('professional', 'Automation & Workflows', 8),
    ('professional', 'Advanced Reports', 9),
    ('business-plus', 'Everything in Professional', 1),
    ('business-plus', 'Premium AI Assistant', 2),
    ('business-plus', 'Advanced Automation', 3),
    ('business-plus', 'Business Intelligence', 4),
    ('business-plus', 'Multiple Businesses / Branches', 5),
    ('business-plus', 'Advanced Permissions', 6),
    ('business-plus', 'Premium Reports', 7),
    ('business-plus', 'Priority Support', 8)
) as features(slug, feature_name, position) on features.slug = p.slug
on conflict (plan_id, feature_name) do update set position = excluded.position;

grant select on public.subscription_plans, public.plan_prices, public.plan_features to anon, authenticated;
grant select on public.subscriptions, public.subscription_events, public.payments, public.invoices,
    public.payment_methods, public.trial_records, public.checkout_sessions, public.billing_history to authenticated;
grant all on public.subscription_plans, public.plan_prices, public.plan_features, public.billing_settings,
    public.subscriptions, public.subscription_events, public.payments, public.invoices, public.payment_methods,
    public.trial_records, public.checkout_sessions, public.billing_history to service_role;
