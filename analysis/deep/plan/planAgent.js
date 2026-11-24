const LLM = require('../../..//llm/llm');
const PromptsUtil = require('../../../utils/promptsUtil');
const Logger = require('../../../utils/logger');
const globals = require("../../../globals");

class PlanAgent {
    constructor() {
        this.llm = new LLM(globals.config.llm);

        this.stage = "none"; // current stage
        this.stages = [];

        this.environment = ""; // current environment
        this.environments = [];
        
        this.discoveries;
    }

    async plan(assessments) {
        if(this.stage == "none") {
            await this._init();
        }

        await this._decideStageAndTasks(assessments);

        if(!this.stage == "none" || this.stage == "complete") return null;

        let plans = await this._generatePlans(this.stage, assessments);

        return plans;
    }

    async _init() {
        const files = globals.graphs.map(graph => graph.file)
                             .map(file => JSON.stringify(file, null, 2)).join("\n\n");

        let prompt = PromptsUtil.read("deep.plan.init");
        prompt = prompt.replaceAll("***FILES***", files);
        Logger.detailed("Init Planning: " + prompt);

        const response = await this.llm.generate({ prompt: prompt, text: true });
        Logger.detailed("Stages Generated: " + response);

        this.stages = JSON.parse(response);
    }

    async _decideStageAndTasks(assessments) {
        let prompt = PromptsUtil.read("deep.plan.stage");
        prompt = prompt.replaceAll("***ASSESSMENTS***", assessments);
        prompt = prompt.replaceAll("***STAGE***", this.stage);
        prompt = prompt.replaceAll("***STAGES***", JSON.stringify(this.stages));
        Logger.detailed(prompt);

        const response = await this.llm.generate({ prompt: prompt, json: true });
        Logger.detailed("Selected Stage: " + JSON.stringify(response));

        this.stage = response.stage;
        this.discoveries = response.discovery;
    }

    async _generatePlans() {
        // prompt for prompt, sequence, formatted output
        let outputPrompt = PromptsUtil.read("deep.plan.output");
        outputPrompt = outputPrompt.replaceAll("***OS***", process.platform);

        const prompt = JSON.stringify(this.discoveries) + "\n\n" + outputPrompt;

        const response = await this.llm.generate({ prompt: prompt, text: true });
        Logger.detailed("Generated Plans: " + response);

        let plans = JSON.parse(response);
        plans = Array.isArray(plans) ? plans : [plans];

        return plans;
    }
}

module.exports = PlanAgent;