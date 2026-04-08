
import { sendOTP } from "../utils/email.util";
import * as dotenv from "dotenv";

dotenv.config();

async function test() {
    console.log("Testing SMTP connection with:", process.env.SMTP_USER);
    try {
        const result = await sendOTP("stapcvs@gmail.com", "123456", "registration");
        console.log("Result:", result);
    } catch (err) {
        console.error("Test failed:", err);
    }
}

test();
