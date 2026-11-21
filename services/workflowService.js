const fs = require("fs");
const path = require("path");

class WorkflowService {

    static baseDir = path.join(process.cwd(), ".deeplyzer");
    static workflowFile = path.join(WorkflowService.baseDir, "workflows.json");

    build(graphs = []) {
        const functionNodeIds = new Set();

        for (const graph of graphs) {
            const nodes = graph.graph?.nodes || [];

            for (const node of nodes) {
                if (node?.is_function === true) {
                    functionNodeIds.add(node.id);
                }
            }
        }

        const workflowMap = new Map();

        for (const nodeId of functionNodeIds) {
            workflowMap.set(nodeId, {
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
}

module.exports = WorkflowService;