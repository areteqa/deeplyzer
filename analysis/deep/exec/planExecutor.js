const BuildCode = require('./buildCode');
const ExecCommand = require('./execCommand');
const IdUtil = require('../../../utils/idUtil');

class PlanExecutor {
    constructor(config) {
        this.buildCode = new BuildCode(config);
        this.execCommand = new ExecCommand();
    }

    async exec(plan) {
        let responses = [];
        
        for (const planItem of plan) {
            const id = IdUtil.generate();

            if (planItem.prompt && planItem.prompt != "") {
                await this.buildCode.build(planItem.prompt, id);
            } 

            if (planItem.commands && planItem.commands.length > 0) {
                for(const command of planItem.commands) {
                    const response = await this.execCommand.exec(command, id);

                    responses.push(response);
                }
            }
        }

        return responses;
    }
}

module.exports = PlanExecutor;