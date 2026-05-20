import crypto from "node:crypto";
import type z from "zod";
import {
    humanFieldsSchema,
    sendRequestSchema,
    verifyRequestSchema,
} from "./schemas.js";
import type {
    Options,
    SendResult,
    VerifyResult,
    CreateAgentMessageInput,
    CreateHumanVerificationMessageInput,
    ResolvedHumanField,
} from "./types.js";

const DEFAULT_CODE_LENGTH = 6;
const BASE_URL = "https://api.pokulabs.com";

export class VerifyHumanError extends Error {
    constructor(
        message: string,
        public readonly statusCode = 400,
        public readonly code?: string,
    ) {
        super(message);
        this.name = "VerifyHumanError";
    }
}

export function createVerification(options: Options) {
    const ttlMs = options.ttlMs ?? 24 * 60 * 60 * 1000; // 24 hours
    const channel = options.channel ?? "email";
    const returnAgentMessage = options.returnAgentMessage ?? false;

    return {
        async send(input: z.infer<typeof sendRequestSchema>) {
            const parsed = sendRequestSchema.parse(input);
            const requestedHumanFields = humanFieldsSchema.parse(options.requestedHumanFields);
            const otpCode = generateNumericCode(DEFAULT_CODE_LENGTH);
            const expiresAt = new Date(Date.now() + ttlMs).toISOString();
            const messageInput = {
                otpCode,
                expiresAt,
                channel,
                to: parsed.to,
                ...(parsed.from === undefined ? {} : { from: parsed.from }),
                requestedHumanFields,
            };
            const response = await request<SendResult>({
                baseUrl: BASE_URL,
                apiKey: options.apiKey,
                path: `/agent-signup/${channel}`,
                body: {
                    verificationId: crypto.randomUUID(),
                    otpCode: otpCode,
                    expiresAt,
                    verificationMessage: (options.createHumanVerificationMessage ?? createHumanVerificationMessage)(messageInput),
                    verificationTarget: {
                        channel: channel,
                        to: parsed.to,
                        from: parsed.from,
                    },
                    requestedHumanFields,
                },
            });
            const result = {
                ...response,
                ...(returnAgentMessage ? {
                    message: (options.createAgentMessage ?? createAgentMessage)({
                        ...messageInput,
                        verificationId: response.verificationId,
                        expiresAt: response.expiresAt,
                    }),
                } : {})
            };

            await options?.onSend?.(result);

            return result;
        },
        async verify(input: z.infer<typeof verifyRequestSchema>) {
            const parsed = verifyRequestSchema.parse(input);
            const verification = await request<VerifyResult>({
                baseUrl: BASE_URL,
                apiKey: options.apiKey,
                path: "/agent-signup/verify",
                body: parsed,
            });

            return await options?.onVerify?.(verification);
        },
    };
}

function createHumanVerificationMessage({
    otpCode,
}: CreateHumanVerificationMessageInput) {
    return [
        `Your verification code is ${otpCode}.`,
        "An agent is asking to create an account on your behalf.",
        "Give this code only if you approve.",
    ].join(" ");
}

function createAgentMessage({
    to,
    requestedHumanFields,
}: CreateAgentMessageInput) {
    return `Verification code sent to ${to}. Ask your human for the code, then POST to the verification endpoint with the following payload: `
    + `{`
    + `'verificationId': '...', 'otpCode': '...', `
    + `${requestedHumanFields.map((field) => `'${field.field}': '<${field.description}>'`).join(', ')}`
    + `}`;
}

function generateNumericCode(length: number) {
    const max = 10 ** length;
    return crypto.randomInt(0, max).toString().padStart(length, "0");
}

async function request<T>({
    baseUrl,
    apiKey,
    path,
    body,
}: {
    baseUrl: string;
    apiKey: string;
    path: string;
    body: unknown;
}): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        let error = response.statusText || "Agent signup request failed";
        let code: string | undefined;
        try {
            const data = await response.json() as { error?: string; code?: string };
            error = data.error ?? error;
            code = data.code;
        } catch {
            // Keep the status text when the response body is not JSON.
        }
        throw new VerifyHumanError(error, response.status, code);
    }

    return response.json() as Promise<T>;
}
