const GraphService = require('./services/graphService');
const WorkflowService = require('./services/workflowService');
const EnvironmentService = require('./services/environmentService');
const StaticAnalyzer = require('./analysis/static/staticAnalyzer');
const OrchestratorAgent = require('./analysis/deep/orchestratorAgent');

const Logger = require('./utils/logger');
const globals = require("./globals");
const SessionManager = require("./session/sessionManager");

class Engine {
    constructor() {
        this.graphService = new GraphService();
        this.workflowService = new WorkflowService(); 
        this.environmentService = new EnvironmentService();
        this.staticAnalyzer = new StaticAnalyzer();

        this.orchestratorAgent = new OrchestratorAgent();
    }

    async run() {        
        try {
            Logger.essential("[ENGINE] Starting Deeplyzer...");
            SessionManager.updateSession({ status: SessionManager.STATUS.IN_PROGRESS });

            // step 1: build graph
            let graphs;
            if (globals.config.build_graph ?? true) {
                graphs = await this.graphService.buildGraphs();
            }

            if(!graphs) {
                graphs = await this.graphService.loadGraphs();
            }
        
            // step 2: build workflows
            let workflows;
            if(SessionManager.checkStage("build_workflows")) {
                workflows = this.workflowService.build(graphs);

                SessionManager.updateSession({ stages: ["build_workflows"] });
            }

            if(!workflows) {
                workflows = this.workflowService.loadWorkflows();
            }

            // step 3: define environments
            await this.environmentService.define();

            // step 4: perform static code analysis
            if (SessionManager.checkStage("static_analysis")) {
                if (globals.config.static_analysis ?? true) {
                    await this.staticAnalyzer.analyze(graphs, workflows);

                    SessionManager.updateSession({ stages: ["static_analysis"] });
                }
            }

            // step 4: perform deep code analysis
            if (SessionManager.checkStage("deep_analysis")) {
                if (globals.config.deep_analysis ?? true) {
                    Logger.essential("[ENGINE] Starting deep analysis...");
                    this.orchestrator.start();
                    
                    SessionManager.updateSession({ stages: ["deep_analysis"] });
                }
            }

            SessionManager.updateSession({ status: SessionManager.STATUS.COMPLETED });
            Logger.essential("[ENGINE] Execution completed.");
        } catch (error) {
            Logger.error("[ENGINE ERROR]", error);
            throw error;
        }
    }
}

module.exports = Engine;
