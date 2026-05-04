import { z } from "zod";

export const e164PhoneNumberSchema = z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, "Phone number must be in E.164 format (e.g. +14155551234)");

export const verificationChannelSchema = z.enum(["sms", "whatsapp", "call"]);

export const startSignupRequestSchema = z.object({
    humanPhoneNumber: e164PhoneNumberSchema,
    agentName: z.string().min(1).max(100).optional(),
    channel: verificationChannelSchema.optional(),
    from: z.string().min(1).max(20).optional(),
});

export const verifySignupRequestSchema = z.object({
    verificationId: z.string().min(1),
    otpCode: z.string().regex(/^\d+$/, "OTP code must be numeric"),
});
