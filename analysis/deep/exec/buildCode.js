const LLM = require('../../llm/llm');
const FileUtil = require('../../utils/fileUtil');
const globals = require("../../globals");

class BuildCode {
    constructor(){
        this.llm = new LLM(globals.config.llm);
        this.fileUtil = new FileUtil();
    }

    async build(prompt, id) {
        const response = await this.llm.generate({ prompt: prompt, json: true });

        this.fileUtil.saveCodeFiles(response, id);
    }
}

module.exports = BuildCode;