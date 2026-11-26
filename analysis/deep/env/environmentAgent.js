const LLM = require('../../../llm/llm');
const PromptsUtil = require('../../../utils/promptsUtil');
const Logger = require('../../../utils/logger');
const globals = require('../../../globals');
const execUtil = require('../../../utils/execUtil');

class EnvironmentAgent {
    constructor() {
        this.existingEnvironments = [];

        this.llm = new LLM(globals.config.llm);
    }

    async setup(workflow) {
        const environment = globals.environments.find(env => env.workflows.includes(workflow.name));

        if (!this.existingEnvironments.includes(environment.name)) {
            let results = [];

            // install runtime
            for (let attempts = 0; attempts < 3; attempts++) {
                results = await this._setupRuntime(environment.runtime, results);
                const assessment = await this._assessResults(environment.runtime, results);

                if (assessment) {
                    this.existingEnvironments.push(environment.name);
                    break;
                }
            }

            // install open package if required for the environment
            const workflowRunnerPackage = globals.openPackages.find(item => item.name === environment.workflowRunner);
            if (workflowRunnerPackage) {
                results = await this._setupOpenPackage(workflowRunnerPackage.name, workflowRunnerPackage.installations);
            }
        }

        const complete = this.existingEnvironments.includes(environment.name);

        return {
            complete: complete,
            environment: environment
        }
    }

    async _setupOpenPackage(packageName, installations) {
        const results = [];

        const installResult = await execUtil.installPackage(packageName);
        results.push(installResult);

        if (installResult.success) {
            const loadResult = await execUtil.loadPackage(packageName);
            results.push(loadResult);
        }

        if(installations && installations.length > 0) {
            for(const installation of installations) {
                await execUtil.exec(installation);
            }
        }

        return results;
    }

    async _setupRuntime(runtimeDetails, existingResults) {
        let prompt = PromptsUtil.read("deep.env.runtime");
        prompt = prompt.replaceAll("***RUNTIME_DETAILS***", runtimeDetails);
        prompt = prompt.replaceAll("***OS***", process.platform);
        prompt = prompt.replaceAll("***RESULTS***", JSON.stringify(existingResults ?? "NONE"));
        Logger.detailed("Setup runtime details: " + prompt);

        const response = await this.llm.generate({ prompt: prompt, json: true });
        Logger.detailed("Commands Generated: " + JSON.stringify(response));

        const results = [];
        for(const command of response.commands) {
            const result = await execUtil.exec(command);

            results.push(result);
        }

        return results;
    }

    async _assessResults(runtimeDetails, results) {
        let prompt = PromptsUtil.read("deep.env.assess");
        prompt = prompt.replaceAll("***RUNTIME_DETAILS***", runtimeDetails);
        prompt = prompt.replaceAll("***RESULTS***", JSON.stringify(results ?? "NONE"));
        Logger.detailed("Setup runtime details: " + prompt);

        const response = await this.llm.generate({ prompt: prompt, text: true });
        Logger.detailed("Setup Exit: " + response);

        return String(response || "").trim().toUpperCase() === "TRUE";
    }
}

module.exports = EnvironmentAgent;