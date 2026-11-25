const Generate = require('./generate/generate');
const Exec = require('./exec/exec');
const Assess = require('./assess/assess');

class DeeplyzerWebEngine {
    constructor() {
        console.log("Deeplyzer Web Engine initialized");

        this.generate = new Generate();
        this.exec = new Exec();
        this.assess = new Assess();
    }

    async start() {
        const results = [];

        // generate
        const testCase = await this.generate.generateTestCases(this.llm, this.src);
        this.logger.detailed("deeplyzer-web-engine: " + JSON.stringify(testCase));

        // execute
        await this.exec.init();
        await this.exec.navigate(this.url);
        const result = await this.exec.execTestCase(testCase);
        this.logger.detailed("deeplyzer-web-engine: " + JSON.stringify(result));

        results.push({
            testCase: testCase,
            result: result, 
        });
        await this.exec.close();

        // assess
        const conclusion = await this.assess.assessResults(this.llm, results);
        this.logger.detailed("deeplyzer-web-engine: " + JSON.stringify(conclusion));

        return conclusion;
    }
 }

module.exports = DeeplyzerWebEngine;