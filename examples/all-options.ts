import express, { type NextFunction, type Response, type Request } from "express";
import { createVerification } from "../src/index.js";

const app = express();
app.use(express.json());

const POKU_API_KEY = "YOUR_POKU_API_KEY";
const verification = createVerification({
    apiKey: POKU_API_KEY,
    channel: "sms",
    requestedHumanFields: [
        { field: "name", description: "Full name" },
        { field: "streetAddress", description: "Street address", optional: true },
    ],
    onSend(result) {
        console.log("Sent verification code to human's email", result.verificationId);
    },
    onVerify(result) {
        console.log("Verified agent", result.verificationId);

        // Replace this with your app's transaction that creates the human account
        // and returns any details the agent needs to use your service
        return {
            userId: "c19bfbb5-a0d4-4091-9777-bdb68dc52e6e",
            apiKey: "de700744-c897-42e2-bd97-cd929c21843e",
        };
    },
    returnAgentMessage: true,
    agentMessage(input) {
        return `Verification code sent to ${input.to}. Ask your human for the code, then POST it back to /agent/verify.`;
    },
    humanVerificationMessage(input) {
        return `Your agent wants to sign you up for ACME. The verification code is ${input.otpCode}. Give this code to your agent if you approve.`;
    },
    ttlMs: 1000 * 60 * 60 * 1, // 1 hour
});



app.post("/agent/signup", async (req, res, next) => {
    try {
        const result = await verification.send({ to: "+12223334444" });
        res.status(202).json(result);
    } catch (error) {
        next(error);
    }
});

app.post("/agent/verify", async (req, res, next) => {
    try {
        const result = await verification.verify({
            otpCode: "123456",
            verificationId: "12f011a0-53b0-4a67-9704-f3762f2bc787",
            // Requested human fields
            name: "Ada Lovelace",
            streetAddress: "123 Main St, Anytown, USA",
        });
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

app.use(( err: Error, _req: Request, res: Response, _next: NextFunction ) => {
    res.status(500).send({ message: err.message });
    console.error(err);
});

app.listen(3005, () => {
    console.log("Server is running on port 3005");
});
