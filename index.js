const Engine = require("./engine");
const SessionManager = require("./session/sessionManager");
const Logger = require('./utils/logger');
const globals = require("./globals");
const fs = require("fs");
const path = require("path");

(async () => {
    try {    
        const argument = process.argv[2];

        // Handle commands
        if (argument === "clear-session") {
            SessionManager.clearSession();
            console.log("[INFO] Session cleared successfully.");
            return;
        }

        if (argument === "reset-analysis-session") {
            SessionManager.resetAnalysisSession();
            console.log("[INFO] Session reset successfully.");
            return;
        }

        // Normal execution
        SessionManager.loadSession();

        globals.config = _loadConfig(argument);

        Logger.init();

        const engine = new Engine();

        await engine.run();

    } catch (error) {
        console.error(`[ERROR] ${error.message}`);
        process.exitCode = 1;
    }
})();

function _loadConfig(configPath) {

    if (!configPath) {
        throw new Error(
            "Configuration file path or command is required.\n" +
            "Usage:\n" +
            "  node index.js <config.json>\n" +
            "  node index.js clear-session"
        );
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