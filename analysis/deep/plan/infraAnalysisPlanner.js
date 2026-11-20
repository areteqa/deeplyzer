const PromptsUtil = require('../../utils/promptsUtil');
const LLM = require('../../llm/llm');
const globals = require("../../globals");

class InfraAnalysisPlanner {
    constructor(graphs) {
        this.graphs = graphs;
        
        this.llm = new LLM(globals.config.llm);
    }

    async plan(existingPlan, existingResponses) {
        let infraInstructions = [];
        for(const graph of this.graphs) {
            if(graph.file.is_infra) {
                infraInstructions.push(graph.file.content);
            }
        }

        if(infraInstructions.length == 0) return null;

        let prompt = PromptsUtil.read("infra_plan");

        prompt = prompt.replaceAll("***INSTRUCTIONS***", infraInstructions.join("\n"));
        prompt = prompt.replaceAll("***EXISTING_PLAN***", JSON.stringify(existingPlan ?? {}));
        prompt = prompt.replaceAll("***EXISTING_RESPONSES***", JSON.stringify(existingResponses ?? {}));

        const response = await this.llm.generate({ prompt: prompt });

        return response;
    }

    async checkExit(responses) {
        let prompt = PromptsUtil.read("check_exit");

        prompt = prompt.replaceAll("***RESPONSES***", JSON.stringify(responses));

        const response = await this.llm.generate({ prompt: prompt, text: true });

        const exit = response?.trim().toUpperCase() === "TRUE";

        return exit;
    }
}

module.exports = InfraAnalysisPlanner;