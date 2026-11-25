const LLM = require('../llm/llm');
const PromptsUtil = require('../utils/promptsUtil');
const Logger = require('../utils/logger');
const globals = require("../globals");
const fs = require('fs');
const path = require('path');

class EnvironmentService {
    static baseDir = path.join(process.cwd(), ".deeplyzer");
    static environmentsFile = path.join(EnvironmentService.baseDir, "environments.json");

    constructor() {
        this.llm = new LLM(globals.config.llm);
    }

    async define() {
        const files = globals.graphs.map(graph => graph.file).filter(Boolean);
        const openDefinitions = this._readOpenDefinitions();

        let prompt = PromptsUtil.read("graph.environment");
        prompt = prompt.replaceAll("***FILES***", JSON.stringify(files));
        prompt = prompt.replaceAll("***OPEN_PACKAGES***", JSON.stringify(openDefinitions));
        Logger.detailed("Define Environments Prompt: " + prompt);

        const response = await this.llm.generate({ prompt: prompt, json: true });
        Logger.detailed("Define Environments: " + JSON.stringify(response));

        this._savEnvironments(response.environments);
    }

    _readOpenDefinitions() {
        const filePath = path.join(__dirname, '..', 'open-packages.json');
        const content = fs.readFileSync(filePath, 'utf8');

        return content;
    }

    _savEnvironments(environments) {
        fs.mkdirSync(EnvironmentService.baseDir, { recursive: true });

        fs.writeFileSync(
            EnvironmentService.environmentsFile,
            JSON.stringify(environments, null, 4),
            "utf8"
        );
    }

}

module.exports = EnvironmentService;