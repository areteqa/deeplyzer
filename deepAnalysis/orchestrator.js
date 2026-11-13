const WorkflowAnalysisPlanner = require('./plan/workflowAnalysisPlanner');
const PlanExecutor = require('./exec/planExecutor');
const InfraAnalysisPlanner = require('./plan/infraAnalysisPlanner');

class DeepAnalysisOrchestrator {
    constructor(config) {
        this.config = config;
        this.planExecutor = new PlanExecutor(config);
    }

    async analyzeWorkflows(workflows) {
        if(!workflows) return;

        const planner = new WorkflowAnalysisPlanner();
        for(const workflow of workflows) {
            const plan = planner.plan(workflow);

            await this.planExecutor.exec(plan);
        }
    }

    async analyzeInfra(graphs) {
        const planner = new InfraAnalysisPlanner(graphs, this.config);
        planner.graphs = graphs;
        
        let exit = false, count = 0, plan, responses;        
        while(!exit) {
            console.log("Generating infra validation plan");
            plan = await planner.plan(plan, responses);

            console.log("Executing infra validations");
            responses = await this.planExecutor.exec(plan);

            console.log("Checking infra validation exit");
            exit = planner.checkExit(plan, responses);

            count = count + 1;
            if(count > 3) break;
        }
    }
}

module.exports = DeepAnalysisOrchestrator;