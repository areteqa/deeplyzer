const Logger = require('../../utils/logger');
const IdUtil = require('../../utils/idUtil');
const LLM = require('../../llm/llm');
const globals = require('../../globals');
const execUtil = require('../../utils/execUtil');

// agents
const EnvironmentAgent = require('./env/environmentAgent');
const PlanAgent = require('./plan/planAgent');
const GenerateAgent = require('./generate/ganerateAgent');
const AssessAgent = require('./assess/assessAgent');

class OrchestratorAgent {
    constructor() {
        this.environmentAgent = new EnvironmentAgent();
        this.planAgent = new PlanAgent();
        this.generateAgent = new GenerateAgent();
        this.assessAgent = new AssessAgent();
    }

    async start(workflows) {
        Logger.essential("Starting deep analysis orchestrator agent");

        for(const workflow of workflows) {
            const setup = await this.environmentAgent.setup(workflow);
            if (!setup.complete) {
                Logger.error(`Setup of required environment for workflow: ${workflow.name} failed.`);
                continue;
            }

            switch(setup.environment.package.type) {
                case "dynamic":
                    await this._runDynamicWorkflow(workflow, setup.environment.setupDetails);
                    break;
                case "open":
                    await this._runOpenPackageWorkflow(workflow, setup.environment);
                    break;
            }
        }        
    }

    async _runDynamicWorkflow(workflow, environment) {
        let results = [];

        // PLAN
        let plans = await this.planAgent.plan(workflow.src, environment);

        for (const plan of plans) {
            const id = IdUtil.generate();

            // GENERATE
            if (plan.prompt && plan.prompt != "") {
                await this.generateAgent.generate(plan.prompt, id);
            }

            // EXECUTE
            if (plan.commands && plan.commands.length > 0) {
                for (const command of plan.commands) {
                    const result = await execUtil.exec(command, id);
                    results.push(result);
                }
            }
        }

        // ASSESS
        const assessments = await this.assessAgent.assess(results);

        return assessments;
    }

    async _runOpenPackageWorkflow(workflow, environment) {
        const result = await execUtil.createInstance(environment.package.name, environment.package.initClass);
        const instance = result.instance;

        instance.logger = Logger;
        instance.llm = new LLM(globals.config.llm);
        instance.src = workflow.src;
        instance.url = "http://localhost:8080/"; // TODO

        const conclusion = await instance.start();

        return conclusion;
    }
}

module.exports = OrchestratorAgent;