
const axios = require("axios");

class OpenAIProvider {
    constructor(llmConfig) {
        this.llmConfig = llmConfig;

        this.client = axios.create({
            baseURL: "https://api.openai.com/v1",
            headers: {
                Authorization: `Bearer ${llmConfig.apiKey}`,
                "Content-Type": "application/json"
            },
            timeout: 300000
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
            content: options.json
                ? `${options.prompt}\n\nReturn the response as valid JSON. Do not include markdown code fences.`
                : options.prompt
        });

        const payload = {
            model: this.llmConfig.model,
            messages
        };

        if (options.temperature !== undefined) {
            payload.temperature = options.temperature;
        }

        if (options.maxTokens !== undefined) {
            payload.max_tokens = options.maxTokens;
        }

        if (options.json) {
            payload.response_format = {
                type: "json_object"
            };
        }

        if (options.responseFormat) {
            payload.response_format = options.responseFormat;
        }

        try {
            const { data } = await this.client.post(
                "/chat/completions",
                payload
            );

            const choice = data.choices?.[0];

            return {
                text: choice?.message?.content || "",
                model: data.model,
                provider: "openai",
                finishReason: choice?.finish_reason,
                usage: {
                    inputTokens: data.usage?.prompt_tokens || 0,
                    outputTokens: data.usage?.completion_tokens || 0,
                    totalTokens: data.usage?.total_tokens || 0
                },
                raw: data
            };

        } catch (error) {
            throw new Error(
                `[OpenAI] ${error.response?.status || "ERROR"}: ${
                    JSON.stringify(
                        error.response?.data || error.message
                    )
                }`
            );
        }
    }
}

module.exports = OpenAIProvider;
