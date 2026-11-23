const Logger = require('../../utils/logger');
const IdUtil = require('../../utils/idUtil');

// agents
const PlanAgent = require('./plan/planAgent');
const GenerateAgent = require('./generate/ganerateAgent');
const ExecAgent = require('./exec/execAgent');
const AssessAgent = require('./assess/assessAgent');

class OrchestratorAgent {
    constructor() {
        this.planAgent = new PlanAgent();
        this.generateAgent = new GenerateAgent();
        this.execAgent = new ExecAgent();
        this.assessAgent = new AssessAgent();
    }

    async start() {
        Logger.essential("Starting deep analysis orchestrator agent");

        let plans, results = [], assessments;

        while(true) {
            results = [];
            assessments = "";

            // PLAN
            plans = await this.planAgent.plan(assessments);

            if(!plans) break; // exit loop if nothing planned

            for (const plan of plans) {
                const id = IdUtil.generate();

                // GENERATE
                if (plan.prompt && plan.prompt != "") {
                    await this.generateAgent.generate(plan.prompt, id);
                }

                // EXECUTE
                if (plan.commands && plan.commands.length > 0) {
                    for (const command of plan.commands) {
                        const result = await this.execAgent.exec(command, id);
                        results.push(result);
                    }
                }
            }

            // ASSESS
            if(results.length > 0) {
                assessments = await this.assessAgent.assess(results);
            }
        }
    }
}

module.exports = OrchestratorAgent;