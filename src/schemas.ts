import { z } from "zod";

export const verificationChannelSchema = z.enum(["sms", "whatsapp", "call", "email"]);

export const humanFieldSchema = z.object({
    field: z.string().min(1),
    description: z.string().min(1),
    optional: z.boolean().default(false),
});
export const humanFieldsSchema = z.array(humanFieldSchema).default([]);

export const sendRequestSchema = z.object({
    to: z
        .string()
        .min(1, "to is required")
        .max(320, "to must be 320 characters or fewer"),
    from: z.string().min(1).max(20).optional(),
});

export const verifyRequestSchema = z.object({
    verificationId: z.string().min(1),
    otpCode: z.union([
        z.string(),
        z.number().int().nonnegative().transform(val => val.toString()), // Accept numeric input and coerce to string
    ]),
}).catchall(z.unknown());
