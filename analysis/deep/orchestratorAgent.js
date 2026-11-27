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

            if(setup.environment.workflowRunner == "dynamic") {
                await this._runDynamicWorkflow(workflow, setup.environment);
            } else {
                await this._runOpenPackageWorkflow(workflow, setup.environment);
            }        
        }        
    }

    async _runDynamicWorkflow(workflow, environment) {
        let results = [];

        // PLAN
        let plans = await this.planAgent.plan(workflow.src, environment.runtime);

        for (const plan of plans) {
            const id = IdUtil.generate();

            // GENERATE
            if (plan.prompt && plan.prompt != "") {
                await this.generateAgent.generate(plan.prompt, workflow.src, id);
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
        // run commands
        for(const command of environment.commands) {
            await execUtil.exec(command);
        }

        // workflow runner
        const workflowRunnerPackage = globals.openPackages.find(item => item.name === environment.workflowRunner); 
        if (workflowRunnerPackage) {
            const result = await execUtil.createInstance(workflowRunnerPackage.name, workflowRunnerPackage.initClass);
            const instance = result.instance;

            instance.logger = Logger;
            instance.llm = new LLM(globals.config.llm);
            instance.src = workflow.src;
            instance.url = "http://localhost:8080/"; // TODO

            const conclusion = await instance.start();

            return conclusion;
        }

        // TODO: STOP ALL PROCESSES
    }
}

module.exports = OrchestratorAgent;