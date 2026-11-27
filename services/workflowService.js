const fs = require("fs");
const path = require("path");
const globals = require('../globals');
const IdUtil = require('../utils/idUtil');

class WorkflowService {

    static baseDir = path.join(process.cwd(), ".deeplyzer");
    static workflowFile = path.join(WorkflowService.baseDir, "workflows.json");

    build() {
        const functionNodeIds = new Set();

        for (const graph of globals.graphs) {
            const nodes = graph.graph?.nodes || [];

            for (const node of nodes) {
                if (node?.is_function === true) {
                    functionNodeIds.add(node.id);
                }
            }
        }

        const workflowMap = new Map();

        // Fallback: entire graph becomes a single workflow
        if (functionNodeIds.size === 0) {
            const allNodes = globals.graphs.flatMap(
                graph => graph.graph?.nodes || []
            );

            if (allNodes.length > 0) {
                const rootNode = allNodes[0];

                workflowMap.set(rootNode.id, {
                    id: IdUtil.generate(),
                    node: rootNode.id,
                    childNodes: allNodes
                        .slice(1)
                        .map(node => node.id)
                });
            }
        } else {
            for (const nodeId of functionNodeIds) {
                workflowMap.set(nodeId, {
                    id: IdUtil.generate(),
                    node: nodeId,
                    childNodes: []
                });
            }

            for (const graph of graphs) {
                const edges = graph.graph?.edges || [];

                for (const edge of edges) {
                    const { node1, node2 } = edge;

                    if (!workflowMap.has(node1) || !workflowMap.has(node2)) {
                        continue;
                    }

                    this._addConnection(workflowMap, node1, node2);
                    this._addConnection(workflowMap, node2, node1);
                }
            }
        }

        const workflows = [...workflowMap.values()];

        this._saveWorkflows(workflows);

        return workflows;
    }

    loadWorkflows() {
        if (!fs.existsSync(WorkflowService.workflowFile)) {
            return [];
        }

        try {
            return JSON.parse(
                fs.readFileSync(WorkflowService.workflowFile, "utf8")
            );
        } catch (error) {
            throw new Error(`Failed to load workflows: ${error.message}`);
        }
    }

    _saveWorkflows(workflows) {
        fs.mkdirSync(WorkflowService.baseDir, { recursive: true });

        fs.writeFileSync(
            WorkflowService.workflowFile,
            JSON.stringify(workflows, null, 4),
            "utf8"
        );
    }

    _addConnection(workflowMap, source, target) {
        const childNodes = workflowMap.get(source).childNodes;

        if (!childNodes.includes(target)) {
            childNodes.push(target);
        }
    }

    fillSources() {
        for (const workflow of globals.workflows || []) {

            const nodeIds = new Set([
                workflow.node,
                ...(workflow.childNodes || [])
            ]);

            // Group source lines by file path
            const fileLines = new Map();

            for (const graph of globals.graphs || []) {

                if (!graph.file?.path) {
                    continue;
                }

                const nodes = (graph.graph?.nodes || []).filter(
                    node => nodeIds.has(node.id)
                );

                if (!nodes.length) {
                    continue;
                }

                const filePath = graph.file.path;

                if (!fileLines.has(filePath)) {
                    fileLines.set(filePath, new Set());
                }

                const lines = fileLines.get(filePath);

                for (const node of nodes) {
                    for (let line = node.startLine; line <= node.endLine; line++) {
                        lines.add(line);
                    }
                }
            }

            // Extract unique lines in ascending order, grouped by file
            const sources = [];

            for (const [filePath, lineNumbers] of fileLines) {

                const content = fs.readFileSync(filePath, "utf8");
                const lines = content.split(/\r?\n/);

                const code = [...lineNumbers]
                    .sort((a, b) => a - b)
                    .map(line => lines[line - 1])
                    .join("\n");

                sources.push(code);
            }

            workflow.src = sources.join("\n\n");
        }
    }
}

module.exports = WorkflowService;