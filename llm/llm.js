
const OpenAIProvider = require("./providers/openai");
const ClaudeProvider = require("./providers/claude");
const GeminiProvider = require("./providers/gemini");

class LLM {
    constructor(llmConfig = {}) {
        const providers = {
            openai: OpenAIProvider,
            claude: ClaudeProvider,
            gemini: GeminiProvider
        };

        const Provider = providers[llmConfig.provider];

        if (!Provider) {
            throw new Error(`Unsupported LLM provider: ${llmConfig.provider}`);
        }

        if (!llmConfig.model || !llmConfig.apiKey) {
            throw new Error("LLM model and API key are required.");
        }

        this.llmConfig = llmConfig;
        this.provider = new Provider(llmConfig);
    }

    async generate(options = {}) {
        if (!options.prompt) {
            throw new Error("Prompt is required.");
        }

        try {
            const response = await this.provider.generate(options);

            if(options.text) return response.text;
            
            return this._parseJSON(response.text);

        } catch (error) {
            throw new Error(
                `[${this.llmConfig.provider}] ${error.message}`
            );
        }
    }

    _parseJSON(text) {
        return JSON.parse(
            text
                .replace(/^```json\s*/i, "")
                .replace(/^```\s*/i, "")
                .replace(/\s*```$/, "")
                .trim()
        );
    }
}

module.exports = LLM;
