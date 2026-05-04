import type { RequestHandler } from "express";
import { AgentSignupError } from "../agent-signup.js";
import type { AgentSignup, VerificationChannel } from "../types.js";

export function createExpressAgentSignup(signup: AgentSignup): {
    signUp(options?: { channel?: VerificationChannel }): RequestHandler;
    verify(): RequestHandler;
} {
    return {
        signUp(options) {
            return async (req, res, next) => {
                try {
                    const result = await signup.start({
                        ...req.body,
                        channel: options?.channel ?? req.body?.channel,
                    });
                    res.status(202).json(result);
                } catch (error) {
                    next(error);
                }
            };
        },
        verify() {
            return async (req, res, next) => {
                try {
                    const result = await signup.verify(req.body);
                    res.status(200).json(result);
                } catch (error) {
                    if (error instanceof AgentSignupError) {
                        res.status(error.statusCode).json({
                            error: error.message,
                            code: error.code,
                        });
                        return;
                    }

                    next(error);
                }
            };
        },
    };
}
