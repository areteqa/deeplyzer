const GraphService = require('./services/graphService');
const WorkflowService = require('./services/workflowService');
const StaticAnalyzer = require('./analysis/static/staticAnalyzer');

const DeepAnalysisOrchestrator = require('./analysis/deep/orchestrator');

const Logger = require('./utils/logger');
const globals = require("./globals");

class Engine {
    async run() {
        try {
            Logger.essential("[ENGINE] Starting Deeplyzer...");
            Logger.essential("[ENGINE] Configuration loaded.");

            // step 1: build graph
            let graphs;
            const graphService = new GraphService();
            if (globals.config.build_graph ?? true) {
                graphs = await graphService.buildGraphs();
            } else {
                graphs = await graphService.loadGraphs();
            }

            
            // step 2: build workflows
            const workflowService = new WorkflowService(); 
            const workflows = workflowService.build(graphs);

            // step 3: perform static code analysis
            if (globals.config.static_analysis ?? true) {
                const staticAnalyzer = new StaticAnalyzer();
                await staticAnalyzer.analyze(graphs, workflows);
            }

            // step 4: perform deep code analysis
            if (globals.config.deep_analysis ?? true) {
                Logger.essential("[ENGINE] Starting deep analysis...");
                const orchestrator = new DeepAnalysisOrchestrator();
                //await orchestrator.analyzeWorkflows(null);
                await orchestrator.analyzeInfra(graphs);
            }

            Logger.essential("[ENGINE] Execution completed.");
        } catch (error) {
            Logger.error("[ENGINE ERROR]", error);
            throw error;
        }
    }
}

module.exports = Engine;
