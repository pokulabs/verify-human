# Verify Human

Verify Human lets an AI agent complete a flow only after a real human approves it with a one-time code.

The main use case is AI-assisted user signup: an agent asks your API to create an account, Poku sends a code to the human, the agent collects that code from the human, and your app provisions the account after verification succeeds. The same pattern can also support workspace invitations, trial activation, delegated admin setup, sensitive configuration changes, or any flow where an agent needs verifiable human approval.

Supported channels are `email`, `sms`, `whatsapp`, and `call`.

## Quick Start

```ts
import { createVerification } from "verify-human";

const verification = createVerification({
    apiKey: process.env.POKU_API_KEY!,
    returnAgentMessage: true,
    async onVerify(result) {
        // Create the human's account after Poku verifies the code.
        return {
            userId: "user_...",
            apiKey: "sk_...",
        };
    },
});

const started = await verification.send({
    to: "human@example.com",
});

// Give started.message to the agent, or tell the agent to ask the human
// for the code sent to the `to` address.

const verified = await verification.verify({
    verificationId: started.verificationId,
    otpCode: "123456",
});
```

`send()` returns `verificationId`, `expiresAt`, `channel`, and any `requestedHumanFields`. If `returnAgentMessage` is true, it also returns `message` instruction for the agent on how to complete the verification. For `sms`, `whatsapp`, and `call`, `to` must be an E.164 phone number, such as `+12223334444`.

`verify()` accepts `{ verificationId, otpCode }` plus any requested human fields as top-level values. Put agent-specific metadata in `agent`. The return value is whatever your `onVerify` hook returns.

## `createVerification()` Options

| Option | Required | Description |
| --- | --- | --- |
| `apiKey` | Hosted only | Poku API key. Create one at [dashboard.pokulabs.com](https://dashboard.pokulabs.com). |
| `channel` | No | Verification channel. Defaults to `email`. Supports `email`, `sms`, `whatsapp`, and `call`. |
| `requestedHumanFields` | No | Additional fields the agent should collect from the human and include in `verify()`, such as full name, street address, etc. Each field has `field`, `description`, and optional `optional`. |
| `returnAgentMessage` | No | When true, `send()` returns a `message` that tells the agent how to collect the code and call your verification endpoint. Defaults to `false`. |
| `onSend` | No | Callback after a verification is sent. Useful for analytics or audit logs. |
| `onVerify` | No | Callback after verification succeeds. Use this to create the account or finish the approved action. `verify()` returns this callback's result. |
| `humanVerificationMessage` | No | Customizes the message sent to the human with the OTP code. |
| `agentMessage` | No | Customizes the instruction returned in `send().message` when `returnAgentMessage` is true. |
| `ttlMs` | No | How long the generated code is valid. Defaults to 24 hours. |
| `send` | Self-managed only | Custom send implementation. Use with `verify` when you do not want Poku to host verification state or deliver messages. |
| `verify` | Self-managed only | Custom verification implementation. Use with `send` to check the code, expiration, required fields, and replay rules yourself. |

## Hosted vs Self-Managed

Hosted mode is the default. Pass `apiKey`, and Poku handles db storage and message sending. Learn more about Poku at [pokulabs.com](https://pokulabs.com), then create your account and API key at [dashboard.pokulabs.com](https://dashboard.pokulabs.com). Your app only needs to expose the flow to the agent and run your provisioning logic in `onVerify`.

Self-managed mode is for teams that want to use their own database or message delivery system. Omit `apiKey` and provide both `send` and `verify`. The library still creates the code, expiry, verification message, and target payload, but your code stores the pending verification, sends the message, verifies the code, and prevents replay.

```ts
const verification = createVerification({
    async send(input) {
        await db.verifications.insert({
            verificationId: input.verificationId,
            otpCode: input.otpCode,
            expiresAt: input.expiresAt,
            target: input.verificationTarget,
            requestedHumanFields: input.requestedHumanFields,
        });

        await email.send({
            to: input.verificationTarget.to,
            body: input.verificationMessage,
        });

        return {
            verificationId: input.verificationId,
            channel: input.verificationTarget.channel,
            requestedHumanFields: input.requestedHumanFields,
            expiresAt: input.expiresAt,
        };
    },
    async verify(input) {
        const pending = await db.verifications.find(input.verificationId);

        if (!pending || pending.otpCode !== input.otpCode) {
            throw new VerifyHumanError("Invalid verification code", 400, "invalid_code");
        }

        if (new Date(pending.expiresAt).getTime() < Date.now()) {
            throw new VerifyHumanError("Verification code expired", 400, "expired_code");
        }

        await db.verifications.consume(input.verificationId);

        return {
            verificationId: input.verificationId,
            verified: true,
        };
    },
});
```

## Express Adapter

The Express adapter exposes route handlers that you can mount behind your own API routes:

```ts
import express from "express";
import { createVerification, createExpressVerification } from "agent-signup";

const app = express();
app.use(express.json());

const verification = createVerification({
    apiKey: process.env.POKU_API_KEY!,
    returnAgentMessage: true,
    async onVerify(result) {
        return {
            verificationId: result.verificationId,
            userId: "user_...",
            apiKey: "sk_...",
        };
    },
});

const agentSignup = createExpressVerification(verification);
app.post("/agent/signup", agentSignup.send());
app.post("/agent/verify", agentSignup.verify());
```

Agents call your SaaS signup routes:

- `POST /agent/signup` with `{ "to": "human@example.com" }`
- `POST /agent/verify` with `{ "verificationId": "...", "otpCode": "123456" }`
