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
console.log(JSON.stringify(testCase));

        // execute
        await this.exec.init();
        await this.exec.navigate(this.url);
        const result = await this.exec.execTestCase(testCase);
console.log(result);
        results.push({
            testCase: testCase,
            result: result, 
        });
        await this.exec.close();

        // assess
        const conclusion = await this.assess.assessResults(this.llm, results);
console.log(conclusion);
        return conclusion;
    }
 }

module.exports = DeeplyzerWebEngine;