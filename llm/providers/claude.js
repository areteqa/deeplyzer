
const axios = require("axios");

class ClaudeProvider {
    constructor(llmConfig) {
        this.llmConfig = llmConfig;
        
        this.client = axios.create({
            baseURL: "https://api.anthropic.com/v1",
            headers: {
                "x-api-key": llmConfig.apiKey,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json"
            }
        });
    }

    async generate(options) {
        const payload = {
            model: this.llmConfig.model,
            messages: [
                {
                    role: "user",
                    content: options.prompt
                }
            ]
        };

        if (options.system) {
            payload.system = options.system;
        }

        if (options.temperature !== undefined) {
            payload.temperature = options.temperature;
        }

        if (options.json) {
            payload.system = [
                payload.system || "",
                "Return only valid JSON. No markdown code fences."
            ].join("\n");
        }

        const { data } = await this.client.post("/messages", payload);

        return {
            text: data.content
                .filter(item => item.type === "text")
                .map(item => item.text)
                .join("\n"),
            model: data.model,
            provider: "claude",
            usage: {
                inputTokens: data.usage?.input_tokens || 0,
                outputTokens: data.usage?.output_tokens || 0,
                totalTokens:
                    (data.usage?.input_tokens || 0) +
                    (data.usage?.output_tokens || 0)
            },
            raw: data
        };
    }
}

module.exports = ClaudeProvider;
