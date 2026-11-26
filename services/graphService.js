const SessionManager = require('../session/sessionManager');
const FileUtil = require('../utils/fileUtil');
const IdUtil = require('../utils/idUtil');
const LLM = require("../llm/llm");
const PromptsUtil = require('../utils/promptsUtil');
const Logger = require('../utils/logger');
const globals = require("../globals");
const path = require("path");

class GraphService {
    constructor() {
        this.fileUtil = new FileUtil();
        this.llm = new LLM(globals.config.llm);
        this.graphs = [];

        this.batchSize = globals.config.batch_size ?? 10;
    }

    async buildGraphs() {
        if(SessionManager.checkStage("find_exclusions")) {
            Logger.essential("Finding source exclusions");
            await this._identifyExclusions();
            
            SessionManager.updateStage("find_exclusions");
        }

        if(SessionManager.checkStage("build_nodes")) {
            Logger.essential("Building nodes is in-progress");
            await this._buildNodes();

            SessionManager.updateStage("build_nodes");
        }

        if(SessionManager.checkStage("connect_edges")) {
            Logger.essential("Connecting edges");
            await this._buildExternalEdges();

            SessionManager.updateStage("connect_edges");
        }
    }

    async _identifyExclusions() {
        const sources = this.fileUtil.readPaths(globals.config.sources, globals.config["source_exclusions"]);
        const folders = [...new Set(sources.map(source => path.dirname(source.path)))];

        let prompt = PromptsUtil.read("graph.source_exclusions");
        prompt = prompt.replaceAll("***PATHS***", JSON.stringify(folders));
        Logger.detailed(prompt);

        const response = await this.llm.generate({ prompt: prompt, json: true });
        Logger.detailed(JSON.stringify(response));

        this.additionalExclusions = response.exclusions;
    }

    async loadGraphs() {
        this.graphs = [];
        this.sources = [];

        const graphFiles = this.fileUtil.readPaths([
            path.join(this.fileUtil.baseDir, "graph")
        ]);

        for (const file of graphFiles) {
            if (!file.filename.endsWith(".json")) continue;

            const data = this.fileUtil.loadJSON(
                path.join("graph", file.filename)
            );

            if (!data?.file || !data?.graph) continue;

            this.graphs.push({
                graphPath: path.join("graph", file.filename),
                file: data.file,
                graph: data.graph
            });

            this.sources.push(data.file);
        }

        return this.graphs;
    }

    async _buildNodes() {
        const sourceFiles = globals.config.sources;
        const exclusions = [...new Set([
                                ...(globals.config["source_exclusions"] || []),
                                ...(this.additionalExclusions)])
                            ]; // merge exclusions, duplicates removed

        this.sources = this.fileUtil.readPaths(sourceFiles, exclusions);

        for (let i = 0; i < this.sources.length; i += this.batchSize) {
            const batch = this.sources.slice(i, i + this.batchSize);

            const results = await Promise.all(
                batch.map(async (source) => {
                    let prompt = PromptsUtil.read("graph.build_nodes");

                    prompt = prompt.replaceAll("***CONTENT***", JSON.stringify(source.content));
                    prompt = prompt.replaceAll("ID-PREFIX", IdUtil.generate());
                    Logger.detailed(prompt);

                    const graph = await this.llm.generate({ prompt: prompt, json: true });
                    Logger.detailed(JSON.stringify(graph));

                    const graphPath = `./graph/${IdUtil.generate()}.json`;

                    source.purpose = graph.purpose;
                    const sourceJson = { file: path.basename(source.path), path: source.path,  purpose: graph.purpose };
                    this.fileUtil.saveJSON(graphPath, { file: sourceJson, graph: { nodes: graph.nodes, edges: graph.edges } });

                    return { graphPath, file: source, graph: { nodes: graph.nodes, edges: graph.edges } };
                })
            );

            this.graphs.push(...results);
        }
    }

    async _buildExternalEdges() {
        for (let i = 0; i < this.graphs.length; i += this.batchSize) {
            const batch = this.graphs.slice(i, i + this.batchSize);

            await Promise.all(
                batch.map(async (sourceGraph) => {
                    const sourceFile = sourceGraph.file.path;

                    for (const node of sourceGraph.graph.nodes) {
                        const patterns = node.external_dependants || [];

                        if (!patterns.length) continue;

                        const matches = this._searchSources(patterns, sourceFile);

                        for (const match of matches) {
                            const candidates = this._findCandidateNodes(match);

                            if (!candidates.length) continue;

                            const sourceNode = {
                                id: node.id,
                                source: this._getNodeSource(sourceFile, node)
                            };

                            const candidateData = candidates.map(candidate => ({
                                id: candidate.id,
                                source: this._getNodeSource(candidate.file, candidate)
                            }));

                            let prompt = PromptsUtil.read("graph.resolve_edges");

                            prompt = prompt.replaceAll(
                                "***SOURCE_NODE***",
                                JSON.stringify(sourceNode, null, 2)
                            );

                            prompt = prompt.replaceAll(
                                "***CANDIDATES***",
                                JSON.stringify(candidateData, null, 2)
                            );

                            const response = await this.llm.generate({ prompt: prompt });

                            let result;

                            try {
                                result = JSON.parse(response.text);
                            } catch {
                                continue;
                            }

                            if (!result?.selectedNodeId) continue;

                            const selected = candidates.find(
                                candidate => candidate.id === result.selectedNodeId
                            );

                            if (!selected) continue;

                            const exists = sourceGraph.graph.edges.some(
                                edge =>
                                    edge.node1 === node.id &&
                                    edge.node2 === selected.id
                            );

                            if (exists) continue;

                            sourceGraph.graph.edges.push({
                                node1: node.id,
                                node2: selected.id
                            });
                        }
                    }

                    const sourceJson = { file: path.basename(sourceGraph.file.path), path: sourceGraph.file.path,  purpose: sourceGraph.file.purpose };
                    this.fileUtil.saveJSON(sourceGraph.graphPath, {
                        file: sourceJson,
                        graph: sourceGraph.graph
                    });
                })
            );
        }
    }

    _getNodeSource(filePath, node) {
        const source = this.sources.find(
            item => item.path === filePath
        );

        if (!source) return "";

        return source.content
            .split(/\r?\n/)
            .slice(node.startLine - 1, node.endLine)
            .join("\n");
    }

    _searchSources(patterns, sourceFile) {
        const matches = [];

        for (const source of this.sources) {

            // Never search the current source file
            if (source.path === sourceFile) continue;

            const lines = source.content.split(/\r?\n/);

            for (let i = 0; i < lines.length; i++) {
                for (const pattern of patterns) {
                    const regex = new RegExp(pattern, "g");
                    let match;

                    while ((match = regex.exec(lines[i])) !== null) {
                        matches.push({
                            file: source.path,
                            line: i + 1,
                            matchedText: match[0],
                            sourceLine: lines[i].trim()
                        });

                        if (!match[0].length) regex.lastIndex++;
                    }
                }
            }
        }

        return [
            ...new Map(
                matches.map(match => [
                    `${match.file}:${match.line}:${match.matchedText}`,
                    match
                ])
            ).values()
        ];
    }

    _findCandidateNodes(match) {
        const candidates = [];

        const source = this.sources.find(
            item => item.path === match.file
        );

        if (!source) return candidates;

        const lines = source.content.split(/\r?\n/);

        for (const sourceGraph of this.graphs) {
            if (sourceGraph.file.path !== match.file) continue;
            for (const node of sourceGraph.graph.nodes) {
                if (
                    match.line >= node.startLine &&
                    match.line <= node.endLine
                ) {
                    candidates.push({
                        ...node,
                        file: sourceGraph.file.path,
                        nodeText: lines.slice(
                            node.startLine - 1,
                            node.endLine
                        ).join("\n")
                    });
                }
            }
        }

        return candidates;
    }
}

module.exports = GraphService;