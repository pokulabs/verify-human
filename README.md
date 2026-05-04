# Agent Signup

Agent Signup helps SaaS teams let AI agents create an account on behalf of a human. The library calls Poku's hosted verification API over SMS, WhatsApp, or call, then lets the SaaS provide its own provisioning logic after verification succeeds.

## Shape

The core API is framework-neutral and does not store OTP state locally:

```ts
const signup = createAgentSignup({
    pokuApiKey: process.env.POKU_API_KEY!,
    channel: "sms",
    async provisionAgent(input) {
        // Create the human account, starter agent, API key, and optional number.
        return {
            accountId: "acct_...",
            agentId: "agt_...",
            apiKey: "sk_...",
            numberId: "num_...",
            phoneNumber: "+14155551234",
        };
    },
});

const started = await signup.start({
    humanPhoneNumber: "+14155551234",
    agentName: "my-agent",
});

const verified = await signup.verify({
    verificationId: started.verificationId,
    otpCode: "123456",
});
```

Framework adapters sit on top of the core. The Express adapter exposes route handlers, but the core can also be used from Next.js route handlers, Hono, Fastify, or serverless functions.

## Why `verificationId`

`verificationId` identifies a specific pending signup attempt in Poku's hosted API. The OTP only proves that the agent received a code from the human. The `verificationId` tells Poku which pending record, channel, human phone number, expiration, and attempt count the code belongs to.

This keeps verification independent from mutable user input and lets the server safely expire, rate-limit, and consume signup attempts.

## Hosted Poku API

Poku owns the database-backed OTP flow with:

```sql
create table agent_signup_verification (
    id text primary key,
    app_user_id text,
    human_phone_number text not null,
    agent_name text,
    medium text not null check (medium in ('sms', 'whatsapp', 'call')),
    code_hash text not null,
    attempts integer not null default 0,
    expires_at timestamptz not null,
    consumed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
```

Routes:

- `POST /agent-signup/:medium` starts verification for `sms`, `whatsapp`, or `call`.
- `POST /agent-signup/verify` verifies `{ verificationId, otpCode }` and returns the verified human/channel metadata.
- Optional `POST /agent-signup/:verificationId/resend` resends with cooldown.
- Optional `GET /agent-signup/:verificationId` returns non-sensitive status for agent UX.

The SaaS still owns its account creation. Use `provisionAgent` to create the human account, starter agent, API key, and optional number after Poku verifies the OTP.

## Events and Logging

The library exposes a `logger` option and lifecycle hooks:

- `onSignupStarted`
- `onVerificationSucceeded`
- `onVerificationFailed`
- `onProvisioned`

Use hooks for analytics, audit trails, webhook fanout, or custom logs. Avoid logging OTPs or returned API keys.
