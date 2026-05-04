import express from "express";
import { createAgentSignup, createExpressAgentSignup } from "./src/index.js";

const app = express();

app.use(express.json());

const agentSignup = createAgentSignup({
    pokuApiKey: "",
    channel: "sms",
    hooks: {
        onSignupStarted(result) {
            console.log("started verification", result.verificationId);
        },
    },
    async provisionAgent({ verificationId, humanPhoneNumber, agentName }) {
        // Replace this with your app's transaction that creates the human account,
        // starter agent, phone number, and API key.
        return {
            accountId: `acct_${verificationId}`,
            agentId: `agt_${verificationId}`,
            apiKey: `sk_example_${verificationId}`,
            humanPhoneNumber,
            agentName,
        };
    },
});
const expressAgentSignup = createExpressAgentSignup(agentSignup);

app.post("/agent/signup", expressAgentSignup.signUp());
app.post("/agent/verify", expressAgentSignup.verify());

app.listen(3005, () => {
    console.log("Server is running on port 3005");
});