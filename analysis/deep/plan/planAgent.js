const LLM = require('../../../llm/llm');
const PromptsUtil = require('../../../utils/promptsUtil');
const Logger = require('../../../utils/logger');
const globals = require("../../../globals");

class PlanAgent {
    constructor() {
        this.llm = new LLM(globals.config.llm);
    }

    async plan(src, environment) {
        // prompt for prompt, sequence, formatted output
        let prompt = PromptsUtil.read("deep.plans");
        prompt = prompt.replaceAll("***SOURCE***", src);
        prompt = prompt.replaceAll("***OS***", process.platform);
        prompt = prompt.replaceAll("***ENVIRONMENT***", environment);
        Logger.detailed("Generated Plans Prompt: " + prompt);

        const response = await this.llm.generate({ prompt: prompt, json: true });
        Logger.detailed("Generated Plans: " + JSON.stringify(response));

        return response.plans;
    }
}

module.exports = PlanAgent;