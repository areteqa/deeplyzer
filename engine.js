const GraphService = require('./services/graphService');
const WorkflowService = require('./services/workflowService');
const StaticAnalyzerService = require('./services/staticAnalyzerService');

const DeepAnalysisOrchestrator = require('./deepAnalysis/orchestrator');

class Engine {
    constructor(config = {}) {
        this.config = config;
    }

    async run() {
        try {
            console.log("[ENGINE] Starting Deeplyzer...");
            console.log("[ENGINE] Configuration loaded.");

            // step 1: build graph
            let graphs;
            const graphService = new GraphService(this.config);
            if (this.config.build_graph ?? true) {
                graphs = await graphService.buildGraphs();
            } else {
                graphs = await graphService.loadGraphs();
            }

            
            // step 2: build workflows
            const workflowService = new WorkflowService(); 
            const workflows = workflowService.build(graphs);

            // step 3: perform static code analysis
            if (this.config.static_analysis ?? true) {
                const staticAnalyzerService = new StaticAnalyzerService(this.config);
                await staticAnalyzerService.analyze(graphs, workflows);
            }

            console.log("[ENGINE] Starting deep analysis...");
            const orchestrator = new DeepAnalysisOrchestrator(this.config);
            //await orchestrator.analyzeWorkflows(null);
            await orchestrator.analyzeInfra(graphs);

            console.log("[ENGINE] Execution completed.");
        } catch (error) {
            console.error("[ENGINE ERROR]", error);
            throw error;
        }
    }
}

module.exports = Engine;
