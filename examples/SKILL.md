---
name: acme-agent-signup
description: Sign up for an Acme API account on behalf of a human using Acme's agent signup verification flow. Use when the human asks the agent to create, configure, or obtain API access for Acme.
---

# Acme Agent Signup

Use this skill when your human asks you to create an Acme account, get Acme API access, or configure yourself to use Acme.

## Core Rule

The signup flow verifies that your human approves account creation. Acme sends a one-time code to the human. Ask your human for that code, then complete verification.

Do not invent human information. If Acme asks for a human field, ask your human for it.

## API Base URL

Use:

```text
http://localhost:3005
```

Replace this with Acme's real production API base URL.

## Step 1: Start Signup

Ask your human which contact method to use if you do not already know it:

- Email: an email address, such as `human@example.com`
- SMS, WhatsApp, or call: a phone number in E.164 format, such as `+14155551234`

Call Acme's signup endpoint:

```bash
curl -X POST http://localhost:3005/agent/signup \
  -H "Content-Type: application/json" \
  -d '{
    "to": "human@example.com"
  }'
```

Expected response:

```json
{
  "verificationId": "12f011a0-53b0-4a67-9704-f3762f2bc787",
  "requestedHumanFields": [
    {
      "field": "name",
      "description": "Full name",
      "optional": false
    }
  ],
  "expiresAt": "2026-05-04T20:30:00.000Z",
  "message": "Verification code sent to human@example.com. Ask your human for the code, then POST to the verification endpoint..."
}
```

Save `verificationId`. You need it for the verify step.

## Step 2: Ask Your Human

If the response includes `message`, follow it. Otherwise say:

```text
I started Acme signup for myself. Acme sent you a verification code. Can you give me the code so I can finish signup?
```

Ask for every non-optional `requestedHumanFields` entry you do not already know:

```text
Acme also needs your full name to create the account. What name should I use?
```

Never guess requested human fields. Wait for the human to provide them.

## Step 3: Complete Verification

Call Acme's verify endpoint:

```bash
curl -X POST http://localhost:3005/agent/verify \
  -H "Content-Type: application/json" \
  -d '{
    "verificationId": "12f011a0-53b0-4a67-9704-f3762f2bc787",
    "otpCode": "123456",
    "name": "Ada Lovelace"
  }'
```

Send requested human fields as top-level values. Put agent-specific metadata in `agent`.

Expected response:

```json
{
  "verificationId": "12f011a0-53b0-4a67-9704-f3762f2bc787",
  "userId": "user_abc123",
  "apiKey": "sk_..."
}
```

## After Success

Store returned credentials in your private configuration or persistent memory:

- `apiKey`
- Any returned account, user, agent, phone number, or workspace ID

Never paste an API key into chat unless your human explicitly asks to see it. Prefer storing it as an environment variable or secret.

## Error Handling

- `400`: You are missing requested human fields. Ask the human for the missing fields and call verify again before the code expires.
- `401`: The code or `verificationId` is invalid. Ask the human to re-check the code.
- `410`: The code expired. Start signup again.
- `429`: Too many attempts. Stop retrying and tell your human.

Do not retry with random data. If you are blocked, explain the exact error to your human.
