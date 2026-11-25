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

            for (let attempts = 0; attempts < 3; attempts++) {
                switch (environment.package.type) {
                    case "dynamic":
                        results = await this._setupDynamic(environment.setupDetails, results);
                        break;

                    case "open":
                        results = await this._setupOpen(environment.name, environment.installations);
                        break;

                    default:
                        throw new Error(`Unsupported package type: ${environment.package}`);
                }

                const assessment = await this._assessResults(environment.setupDetails, results);

                if (assessment) {
                    this.existingEnvironments.push(environment.name);
                    break;
                }
            }
        }

        const complete = this.existingEnvironments.includes(environment.name);

        return {
            complete: complete,
            environment: environment
        }
    }

    async _setupOpen(packageName, installations) {
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

    async _setupDynamic(setupDetails, existingResults) {
        let prompt = PromptsUtil.read("deep.env.dynamic");
        prompt = prompt.replaceAll("***SETUP_DETAILS***", setupDetails);
        prompt = prompt.replaceAll("***OS***", process.platform);
        prompt = prompt.replaceAll("***RESULTS***", JSON.stringify(existingResults ?? "NONE"));
        Logger.detailed("Setup dynamic details: " + prompt);

        const response = await this.llm.generate({ prompt: prompt, json: true });
        Logger.detailed("Commands Generated: " + JSON.stringify(response));

        const results = [];
        for(const command of response.commands) {
            const result = await execUtil.exec(command);

            results.push(result);
        }

        return results;
    }

    async _assessResults(setupDetails, results) {
        let prompt = PromptsUtil.read("deep.env.assess");
        prompt = prompt.replaceAll("***SETUP_DETAILS***", setupDetails);
        prompt = prompt.replaceAll("***RESULTS***", JSON.stringify(results ?? "NONE"));
        Logger.detailed("Setup dynamic details: " + prompt);

        const response = await this.llm.generate({ prompt: prompt, text: true });
        Logger.detailed("Setup Exit: " + response);

        return String(response || "").trim().toUpperCase() === "TRUE";
    }
}

module.exports = EnvironmentAgent;