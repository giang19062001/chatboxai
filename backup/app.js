const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { exec, spawn } = require("child_process");
const { v4: uuidv4 } = require("uuid");
const { translate } = require("@vitalets/google-translate-api");

const app = express();
const port = 3592;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

app.post("/api/chat", async (req, res) => {
    const { message, sessionId = uuidv4() } = req.body;

    if (!message) {
        return res.status(400).json({ error: "Message is required" });
    }

    console.log(`Session ${sessionId}: ${message}`);

    try {
        // Dịch câu hỏi từ tiếng Việt sang tiếng Anh
        const translatedToEnglish = await translate(message, { from: "vi", to: "en" });
        const englishMessage = translatedToEnglish.text;
        console.log(`Translated to English: ${englishMessage}`);

        // Gửi câu hỏi tiếng Anh đến mô hình
        const response = await new Promise((resolve, reject) => {
            const command = `echo "${englishMessage.replace(/"/g, '\\"')}" | docker model run ai/smollm2`;
            console.log(`command ===============>  : ${command}`);

            exec(
                command,
                {
                    timeout: 35920,
                    encoding: "utf8",
                },
                (error, stdout, stderr) => {
                    console.log("Raw stdout ===============> :", JSON.stringify(stdout));
                    console.log("Raw stderr ===============>:", JSON.stringify(stderr), " ===============> error ===============>:", error);

                    const fullOutput = stderr ? stdout + stderr : stdout;

                    if (fullOutput.trim() === "") {
                        reject(new Error("Empty response from model"));
                        return;
                    }

                    const response = extractResponse(fullOutput, englishMessage);
                    resolve(response);
                }
            );
        });

        // Dịch câu trả lời từ tiếng Anh sang tiếng Việt
        const translatedToVietnamese = await translate(response, { from: "en", to: "vi" });
        const vietnameseResponse = translatedToVietnamese.text;
        console.log(`Translated to Vietnamese: ${vietnameseResponse}`);

        res.json({
            success: true,
            response: vietnameseResponse,
            sessionId: sessionId,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Chat error:", error);
        res.status(500).json({
            success: false,
            error: error.message,
            sessionId: sessionId,
        });
    }
});

function extractResponse(output, userMessage) {
    console.log("extractResponse ===============>  in ===========> ", JSON.stringify(output));

    let response = output
        .replace(/docker model run ai\/smollm2/g, "")
        .replace(/Interactive chat mode started/g, "")
        .replace(/Type '\/bye' to exit/g, "")
        .replace(/>/g, "")
        .replace(/\r\n/g, "\n")
        .trim();

    const escapedUserMessage = userMessage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const userMessageRegex = new RegExp(escapedUserMessage, "gi");
    response = response.replace(userMessageRegex, "");

    const lines = response.split("\n").filter((line) => {
        const trimmed = line.trim();
        return (
            trimmed.length > 0 &&
            !trimmed.includes("docker") &&
            !trimmed.match(/^[#>]/) &&
            !trimmed.includes("Interactive chat") &&
            !trimmed.includes("Type '/bye'") &&
            !trimmed.includes("Token usage:") &&
            !trimmed.match(/Token usage:.*prompt.*completion.*total/)
        );
    });

    const finalResponse = lines.join("\n").trim();
    console.log(
        "extractResponse ===============>  out ===========> ",
        finalResponse || "No response received from model"
    );

    return finalResponse || "No response received from model";
}

app.listen(port, () => {
    console.log(` Server running at http://localhost:${port}`);
});
