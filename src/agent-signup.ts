import { startSignupRequestSchema, verifySignupRequestSchema } from "./schemas.js";
import type {
    AgentSignupOptions,
    AgentSignupStartResult,
    AgentSignupVerifyResult,
    VerificationChannel,
} from "./types.js";

export class AgentSignupError extends Error {
    constructor(
        message: string,
        public readonly statusCode = 400,
        public readonly code?: string,
    ) {
        super(message);
        this.name = "AgentSignupError";
    }
}

const baseUrl = "http://localhost:3000";

export function createAgentSignup(options: AgentSignupOptions) {
    const channel = options.channel ?? "sms";

    return {
        async start(input: {
            humanPhoneNumber: string;
            agentName?: string;
            channel?: VerificationChannel;
            from?: string;
        }) {
            const parsed = startSignupRequestSchema.parse(input);
            const selectedChannel = parsed.channel ?? channel;
            const result = await request<AgentSignupStartResult>({
                apiKey: options.pokuApiKey,
                path: `/agent-signup/${selectedChannel}`,
                body: {
                    humanPhoneNumber: parsed.humanPhoneNumber,
                    agentName: parsed.agentName,
                    from: parsed.from,
                },
            });

            await options.hooks?.onSignupStarted?.(result);
            await options.hooks?.onLog?.("info", "Agent signup verification started", {
                verificationId: result.verificationId,
                channel: result.channel,
            });

            return result;
        },
        async verify(input: {
            verificationId: string;
            otpCode: string;
        }) {
            const parsed = verifySignupRequestSchema.parse(input);
            let verification: AgentSignupVerifyResult;
            try {
                verification = await request<AgentSignupVerifyResult>({
                    apiKey: options.pokuApiKey,
                    path: "/agent-signup/verify",
                    body: parsed,
                });
            } catch (error) {
                const failure = {
                    verificationId: parsed.verificationId,
                    error: error instanceof Error ? error.message : "Verification failed",
                    ...(error instanceof AgentSignupError ? { statusCode: error.statusCode } : {}),
                };
                await options.hooks?.onVerificationFailed?.({
                    ...failure,
                });
                throw error;
            }

            await options.hooks?.onVerificationSucceeded?.(verification);

            if (!options.provisionAgent) {
                return verification;
            }

            const provisioned = await options.provisionAgent({
                verificationId: verification.verificationId,
                humanPhoneNumber: verification.humanPhoneNumber,
                channel: verification.channel,
                ...(verification.agentName ? { agentName: verification.agentName } : {}),
            });

            await options.hooks?.onProvisioned?.({ verification, result: provisioned });
            await options.hooks?.onLog?.("info", "Agent signup provisioned", {
                verificationId: verification.verificationId,
                channel: verification.channel,
            });

            return {
                ...provisioned,
                ...verification,
            };
        },
    };
}

async function request<T>({
    apiKey,
    path,
    body,
}: {
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
        throw new AgentSignupError(error, response.status, code);
    }

    return response.json() as Promise<T>;
}
