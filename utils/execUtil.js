const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const fs = require("fs");
const { createRequire } = require("module");
const { pathToFileURL } = require("url");

class ExecUtil {
    constructor() {
        this.baseDir = path.join(process.cwd(), ".deeplyzer");
        this.execAsync = util.promisify(exec);

        this.packageRequire = createRequire(
            path.join(this.baseDir, "package.json")
        );

        this.platform = process.platform;
        this.shell = this._getShell();
    }

    async exec(command, id) {
        let cwd = this.baseDir
        if(id) {
            cwd = path.join(this.baseDir, "src", id);

            fs.mkdirSync(cwd, { recursive: true });
        }

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

    async installPackage(packageName) {
        try {
            fs.mkdirSync(this.baseDir, { recursive: true });

            const { stdout, stderr } = await this.execAsync(
                `npm install ${packageName} --no-save`,
                {
                    cwd: this.baseDir,
                    shell: this.shell,
                    windowsHide: true,
                    maxBuffer: 10 * 1024 * 1024
                }
            );

            if (stdout) process.stdout.write(stdout);
            if (stderr) process.stderr.write(stderr);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: "Package installation failed:" + error.message
            }
        }
    }

    async loadPackage(packageName) {
        try {
            // Resolve from .deeplyzer/node_modules
            const modulePath = this.packageRequire.resolve(packageName);

            // Dynamically load CommonJS or ES modules
            const module = await import(
                pathToFileURL(modulePath).href
            );

            return {
                success: true,
                module: module.default || module
            };

        } catch (error) {
            return {
                success: false,
                error: "Package loading failed: " + error.message
            };
        }
    }

    async createInstance(packageName, className, ...args) {
        try {
            const modulePath = this.packageRequire.resolve(packageName);

            const importedModule = await import(
                require("url").pathToFileURL(modulePath).href
            );

            // Support named exports and default exports
            const exports = importedModule.default
                ? { ...importedModule, ...importedModule.default }
                : importedModule;

            const TargetClass = exports[className];

            if (typeof TargetClass !== "function") {
                throw new Error(`Class not found: ${className}`);
            }

            const instance = new TargetClass(...args);

            return {
                success: true,
                instance
            };

        } catch (error) {
            return {
                success: false,
                error: "Instance creation failed: " + error.message
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

module.exports = new ExecUtil();