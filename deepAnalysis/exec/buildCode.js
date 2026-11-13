const LLM = require('../../llm/llm');
const FileUtil = require('../../utils/fileUtil');

class BuildCode {
    constructor(config){
        this.llm = new LLM(config.llm);
        this.fileUtil = new FileUtil();
    }

    async build(prompt, id) {
        const response = await this.llm.generate({ prompt: prompt, json: true });

        this.fileUtil.saveCodeFiles(response, id);
    }
}

module.exports = BuildCode;