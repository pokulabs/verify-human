import type { createVerification } from "./verify-human.js";
import type { z } from "zod";
import type {
    humanFieldSchema,
    humanFieldsSchema,
    verificationChannelSchema,
} from "./schemas.js";

export type VerificationChannel = z.infer<typeof verificationChannelSchema>;
export type HumanSignupField = z.input<typeof humanFieldSchema>;
export type ResolvedHumanField = z.infer<typeof humanFieldSchema>;
export type HumanFields = z.input<typeof humanFieldsSchema>;

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
    requestedHumanFields: ResolvedHumanField[];
    expiresAt: string;
    message?: string;
};

export type VerifyResult = {
    verificationId: string;
    verified: boolean;
};

export type CreateHumanVerificationMessageInput = {
    otpCode: string;
    expiresAt: string;
    channel: VerificationChannel;
    to: string;
    from?: string;
    requestedHumanFields: ResolvedHumanField[];
};

export type CreateAgentMessageInput = {
    verificationId: string;
    expiresAt: string;
    channel: VerificationChannel;
    to: string;
    from?: string;
    requestedHumanFields: ResolvedHumanField[];
};

export type Options = {
    apiKey: string;
    channel?: VerificationChannel;
    requestedHumanFields?: HumanFields;
    onSend?(result: SendResult): void | Promise<void>;
    onVerify?(result: VerifyResult): any | Promise<any>;
    returnAgentMessage?: boolean;
    createHumanVerificationMessage?(input: CreateHumanVerificationMessageInput): string;
    createAgentMessage?(input: CreateAgentMessageInput): string;
    ttlMs?: number;
};

export type VerifyHuman = ReturnType<typeof createVerification>;