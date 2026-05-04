import type { createAgentSignup } from "./agent-signup.js";

export type VerificationChannel = "sms" | "whatsapp" | "call";

export type AgentSignupProvisioningResult = {
    accountId?: string;
    agentId?: string;
    apiKey?: string;
    numberId?: string;
    phoneNumber?: string;
    [key: string]: unknown;
};

export type AgentSignupStartResult = {
    verificationId: string;
    humanPhoneNumber: string;
    channel: VerificationChannel;
    expiresAt: string;
    message: string;
};

export type AgentSignupVerifyResult = AgentSignupProvisioningResult & {
    verificationId: string;
    humanPhoneNumber: string;
    agentName?: string;
    channel: VerificationChannel;
    verified: boolean;
};

export type AgentSignupHooks = {
    onSignupStarted?(result: AgentSignupStartResult): void | Promise<void>;
    onVerificationSucceeded?(result: AgentSignupVerifyResult): void | Promise<void>;
    onVerificationFailed?(params: {
        verificationId: string;
        statusCode?: number;
        error: string;
    }): void | Promise<void>;
    onProvisioned?(params: {
        verification: AgentSignupVerifyResult;
        result: AgentSignupProvisioningResult;
    }): void | Promise<void>;
    onLog?(level: "debug" | "info" | "warn" | "error", message: string, context?: Record<string, unknown>): void | Promise<void>;
};

export type AgentSignupOptions = {
    pokuApiKey: string;
    channel?: VerificationChannel;
    hooks?: AgentSignupHooks;
    provisionAgent?(input: {
        verificationId: string;
        humanPhoneNumber: string;
        agentName?: string;
        channel: VerificationChannel;
    }): Promise<AgentSignupProvisioningResult>;
};

export type AgentSignup = ReturnType<typeof createAgentSignup>;