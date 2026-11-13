
const axios = require("axios");

class GeminiProvider {
    constructor(llmConfig) {
        this.llmConfig = llmConfig;

        this.client = axios.create({
            baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
            headers: {
                Authorization: `Bearer ${llmConfig.apiKey}`,
                "Content-Type": "application/json"
            }
        });
    }

    async generate(options) {
        const messages = [];

        if (options.system) {
            messages.push({
                role: "system",
                content: options.system
            });
        }

        messages.push({
            role: "user",
            content: options.prompt
        });

        const payload = {
            model: this.llmConfig.model,
            messages
        };

        if (options.temperature !== undefined) {
            payload.temperature = options.temperature;
        }

        if (options.json) {
            payload.response_format = {
                type: "json_object"
            };
        }

        const { data } = await this.client.post(
            "/chat/completions",
            payload
        );

        return {
            text: data.choices?.[0]?.message?.content || "",
            model: data.model,
            provider: "gemini",
            usage: {
                inputTokens: data.usage?.prompt_tokens || 0,
                outputTokens: data.usage?.completion_tokens || 0,
                totalTokens: data.usage?.total_tokens || 0
            },
            raw: data
        };
    }
}

module.exports = GeminiProvider;
