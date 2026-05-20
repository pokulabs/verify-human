import express, { type NextFunction, type Response, type Request } from "express";
import { createVerification, createExpressVerification } from "../src/index.js";

const app = express();
app.use(express.json());

const POKU_API_KEY = "YOUR_POKU_API_KEY";
const verification = createVerification({
    apiKey: POKU_API_KEY,
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
});

const expressAgentSignup = createExpressVerification(verification);
app.post("/agent/signup", expressAgentSignup.send());
app.post("/agent/verify", expressAgentSignup.verify());

app.use(( err: Error, _req: Request, res: Response, _next: NextFunction ) => {
    res.status(500).send({ message: err.message });
    console.error(err);
});

app.listen(3005, () => {
    console.log("Server is running on port 3005");
});
