class WorkflowService {

    build(graphs = []) {
        const functionNodeIds = new Set();

        // Collect function node IDs across all graphs
        for (const graph of graphs) {
            const nodes = graph.graph?.nodes || [];

            for (const node of nodes) {
                if (node?.is_function === true) {
                    functionNodeIds.add(node.id);
                }
            }
        }

        // Initialize workflow entries for every function node
        const workflowMap = new Map();

        for (const nodeId of functionNodeIds) {
            workflowMap.set(nodeId, {
                node: nodeId,
                childNodes: []
            });
        }

        // Build connections from edges in both directions
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

        return [...workflowMap.values()];
    }

    _addConnection(workflowMap, source, target) {
        const childNodes = workflowMap.get(source).childNodes;

        if (!childNodes.includes(target)) {
            childNodes.push(target);
        }
    }

}

module.exports = WorkflowService;