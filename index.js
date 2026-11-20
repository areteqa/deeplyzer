
const Engine = require("./engine");
const globals = require("./globals");
const fs = require("fs");
const path = require("path");

(async () => {
    try {
        globals.config = _loadConfig();

        const engine = new Engine();

        await engine.run();

    } catch (error) {
        console.error(`[ERROR] ${error.message}`);
        process.exitCode = 1;
    }
})();

function _loadConfig() {
    const configPath = process.argv[2];

    if (!configPath) {
        throw new Error("Configuration file path is required.\nUsage: node index.js <config.json>");
    }

    const resolvedPath = path.resolve(configPath);

    if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Configuration file not found: ${resolvedPath}`);
    }

    const configContent = fs.readFileSync(resolvedPath, "utf8");
    const config = JSON.parse(configContent);

    if (!config || typeof config !== "object" || Array.isArray(config)) {
        throw new Error("Configuration must be a valid JSON object.");
    }

    return config;
}