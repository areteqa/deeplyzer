const LLM = require('../../..//llm/llm');
const globals = require('../../../globals');
const Logger = require('../../../utils/logger');
const FileUtil = require('../../../utils/fileUtil');
const PromptsUtil = require('../../../utils/promptsUtil');

class GenerateAgent {
    constructor() {
        this.llm = new LLM(globals.config.llm);
        this.fileUtil = new FileUtil();
    }

    async generate(generatePrompt, id) {
        const outputPrompt = PromptsUtil.read("deep.generate.output");

        const prompt = generatePrompt + "\n\n" + outputPrompt;
        Logger.detailed("Generate Agent Internal Prompt: " + prompt);

        let files = await this.llm.generate({ prompt: prompt, json: true });
        Logger.detailed("Generate Agent Internal Response: " + JSON.stringify(files));
        
        files = Array.isArray(files) ? files : [files];

        this.fileUtil.saveCodeFiles(files, id);
    }
}

module.exports = GenerateAgent;