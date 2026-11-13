const FileUtil = require('../utils/fileUtil');
const LLM = require("../llm/llm");
const PromptsUtil = require('../utils/promptsUtil');

class StaticAnalyzerService {
    constructor(config) {
        this.config = config;
        this.fileUtil = new FileUtil();
        this.llm = new LLM(config.llm);
    }

    async analyze(graphs, workflows) {
        const results = [];

        for (const workflow of workflows) {
            const source = this._getWorkflowSource(graphs, workflow);

            if (!source.trim()) continue;

            let prompt = PromptsUtil.read("static_analysis");
            prompt = prompt.replaceAll("***SOURCE_CODE***", source);
console.log(prompt);
            const response = await this.llm.generate({ prompt: prompt });

            results.push({
                workflow: workflow.node,
                analysis: response
            });
        }

        return results;
    }

    _getWorkflowSource(graphs, workflow) {
        const nodeIds = new Set([
            workflow.node,
            ...(workflow.childNodes || [])
        ]);

        const sources = [];

        for (const graph of graphs) {
            const nodes = graph.graph?.nodes || [];

            for (const node of nodes) {
                if (!nodeIds.has(node.id)) continue;

                const source = this._extractSource(graph, node);

                if (!source) continue;

                sources.push({
                    file: graph.file.path,
                    startLine: node.startLine,
                    endLine: node.endLine,
                    source
                });
            }
        }

        return sources.map(item => {
            return `
/**
 * File: ${item.file}
 * Lines: ${item.startLine}-${item.endLine}
 */

${item.source}
`;
        }).join("\n\n");
    }

    _extractSource(graph, node) {
        if (!node.startLine || !node.endLine || !graph.file?.content) {
            return "";
        }

        const lines = graph.file.content.split(/\r?\n/);

        return lines.slice(node.startLine - 1, node.endLine).join("\n");
    }
}

module.exports = StaticAnalyzerService;