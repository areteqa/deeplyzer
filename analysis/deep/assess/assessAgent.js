const LLM = require('../../..//llm/llm');
const PromptsUtil = require('../../../utils/promptsUtil');
const globals = require("../../../globals");
const Logger = require('../../../utils/logger');

class AssessAgent {
    constructor() {
        this.llm = new LLM(globals.config.llm);
    }

    async assess(results) {
        let prompt = PromptsUtil.read("deep.assess");

        prompt = prompt.replaceAll("***RESULTS***", JSON.stringify(results));
        //Logger.detailed(prompt);

        const response = await this.llm.generate({ prompt: prompt, text: true });
        Logger.detailed(response);

        return response;
    }
}

module.exports = AssessAgent;