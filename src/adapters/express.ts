import type { RequestHandler } from "express";
import { VerifyHumanError } from "../verify-human.js";
import type { VerifyHuman } from "../types.js";

export function createExpressVerification(signup: VerifyHuman): {
    send(): RequestHandler;
    verify(): RequestHandler;
} {
    return {
        send() {
            return async (req, res, next) => {
                try {
                    const result = await signup.send(req.body);
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
                    if (error instanceof VerifyHumanError) {
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
