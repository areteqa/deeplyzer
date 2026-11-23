const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const fs = require("fs");

class ExecAgent {
    constructor() {
        this.baseDir = path.join(process.cwd(), ".deeplyzer");
        this.execAsync = util.promisify(exec);

        this.platform = process.platform;
        this.shell = this._getShell();
    }

    async exec(command, id) {
        const cwd = path.join(this.baseDir, "src", id);

        fs.mkdirSync(cwd, { recursive: true });

        try {
            const { stdout, stderr } = await this.execAsync(command, {
                cwd,
                shell: this.shell,
                windowsHide: true,
                maxBuffer: 10 * 1024 * 1024
            });

            if (stdout) process.stdout.write(stdout);
            if (stderr) process.stderr.write(stderr);

            return { success: true, stdout, stderr };
        } catch (error) {
            console.error(`[COMMAND ERROR] ${error.message}`);

            return {
                success: false,
                stdout: error.stdout || "",
                stderr: error.stderr || "",
                error: error.message
            };
        }
    }

    _getShell() {
        switch (this.platform) {
            case "win32":
                return "powershell.exe";

            case "darwin":
                return "/bin/zsh";

            case "linux":
                return "/bin/bash";

            default:
                throw new Error(`Unsupported operating system: ${this.platform}`);
        }
    }
}

module.exports = ExecAgent;