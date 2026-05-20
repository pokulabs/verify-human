import type { createVerification } from "./verify-human.js";

export type VerificationChannel = "sms" | "whatsapp" | "call" | "email";
export type ResolvedHumanField = {
    field: string;
    description: string;
    optional?: boolean;
};
export type VerifyVerificationInput = {
    verificationId: string;
    otpCode: string;
    [x: string]: unknown;
};

export type GeneratedVerification = {
    verificationId: string;
    otpCode: string;
    expiresAt: string;
    verificationMessage: string;
    agentMessage?: string;
};

export type SendResult = {
    verificationId: string;
    channel: VerificationChannel;
    requestedHumanFields?: ResolvedHumanField[];
    expiresAt: string;
    message?: string;
};

export type VerifyResult = {
    verificationId: string;
    verified: boolean;
};

export type SendVerificationInput = {
    verificationId: string;
    otpCode: string;
    expiresAt: string;
    verificationMessage: string;
    verificationTarget: {
        channel: VerificationChannel;
        to: string;
        from?: string;
    };
    requestedHumanFields?: ResolvedHumanField[];
};

export type HumanVerificationMessageInput = {
    otpCode: string;
    expiresAt: string;
    channel: VerificationChannel;
    to: string;
    from?: string;
    requestedHumanFields?: ResolvedHumanField[];
};

export type AgentMessageInput = {
    to: string;
    requestedHumanFields?: ResolvedHumanField[];
};

export type Options = {
    apiKey?: string;
    send?: (input: SendVerificationInput) => (any & { message?: string }) | Promise<(any & { message?: string })>;
    verify?: (input: VerifyVerificationInput) => any;
    channel?: VerificationChannel;
    requestedHumanFields?: ResolvedHumanField[];
    onSend?(result: SendResult): void | Promise<void>;
    onVerify?(result: VerifyResult): any | Promise<any>;
    returnAgentMessage?: boolean;
    humanVerificationMessage?(input: HumanVerificationMessageInput): string;
    agentMessage?(input: AgentMessageInput): string;
    ttlMs?: number;
};

export type VerifyHuman = ReturnType<typeof createVerification>;