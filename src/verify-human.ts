import crypto from "node:crypto";
import type {
    Options,
    SendResult,
    VerifyResult,
    AgentMessageInput,
    HumanVerificationMessageInput,
    ResolvedHumanField,
    SendVerificationInput,
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
    validateOptions(options);

    return {
        async send(input: { to: string; from?: string }) {
            const requestedHumanFields = (options.requestedHumanFields ?? []) as ResolvedHumanField[];
            const otpCode = generateNumericCode(DEFAULT_CODE_LENGTH);
            const expiresAt = new Date(Date.now() + ttlMs).toISOString();
            const sendVerificationInput: SendVerificationInput = {
                verificationId: crypto.randomUUID(),
                otpCode,
                expiresAt,
                verificationMessage: (options.humanVerificationMessage ?? humanVerificationMessage)({
                    otpCode,
                    expiresAt,
                    channel,
                    to: input.to,
                    ...(!input.from ? {} : { from: input.from }),
                    requestedHumanFields,
                }),
                verificationTarget: {
                    channel,
                    to: input.to,
                    ...(!input.from ? {} : { from: input.from }),
                },
                requestedHumanFields,
            };
            const response = !options.send
                ? await request<SendResult>({
                    baseUrl: BASE_URL,
                    apiKey: options.apiKey!,
                    path: `/agent-signup/${channel}`,
                    body: sendVerificationInput,
                })
                : await options.send(sendVerificationInput);

            const result = {
                ...response,
                ...(returnAgentMessage ? {
                    message: (options.agentMessage ?? createAgentMessage)({
                        to: input.to,
                        requestedHumanFields,
                    }),
                } : {})
            };

            await options?.onSend?.(result);

            return result;
        },
        async verify(input: { verificationId: string; otpCode: string; [x: string]: unknown }) {
            const verification = !options.verify
                ? await request<VerifyResult>({
                    baseUrl: BASE_URL,
                    apiKey: options.apiKey!,
                    path: "/agent-signup/verify",
                    body: input,
                })
                : await options.verify(input);

            return await options?.onVerify?.(verification);
        },
    };
}

function humanVerificationMessage({
    otpCode,
}: HumanVerificationMessageInput) {
    return [
        `Your verification code is ${otpCode}.`,
        "An agent is asking to create an account on your behalf.",
        "Give it this code if you approve.",
    ].join(" ");
}

function createAgentMessage({
    to,
    requestedHumanFields,
}: AgentMessageInput) {
    return `Verification code sent to ${to}. Ask your human for the code, then POST to the verification endpoint with the following payload: `
    + `{`
    + `'verificationId': '...', 'otpCode': '...', `
    + `${requestedHumanFields?.map((field) => `'${field.field}': '<${field.description}>'`).join(', ')}`
    + `}`;
}

function generateNumericCode(length: number) {
    const max = 10 ** length;
    return crypto.randomInt(0, max).toString().padStart(length, "0");
}

function validateOptions(options: Options): void {
    if (!options.apiKey && (!options.send || !options.verify)) {
        throw new VerifyHumanError(`apiKey is required when "send" or "verify" methods are not supplied`);
    }
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
        let error = response.statusText || "Request failed";
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
