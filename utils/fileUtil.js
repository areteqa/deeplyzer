
const fs = require("fs");
const path = require("path");

class FileUtil {
    constructor() {
        this.baseDir = path.join(process.cwd(), ".deeplyzer");
        this._ensureDirectory();
    }

    saveCodeFiles(files, outputDir) {
        const root = path.resolve(this.baseDir, "src", outputDir);
        const srcDir = path.resolve(this.baseDir, "src");

        if (!root.startsWith(srcDir + path.sep)) {
            throw new Error(`Invalid output directory: ${outputDir}`);
        }

        fs.mkdirSync(root, { recursive: true });

        if (!Array.isArray(files)) {
            files = [files];
        }

        const savedFiles = [];

        for (const file of files) {
            if (!file || typeof file.filename !== "string" || typeof file.source !== "string") {
                throw new Error("Invalid file. Expected filename and source strings.");
            }

            const filename = path.basename(file.filename);

            if (filename !== file.filename || !filename.endsWith(".py")) {
                throw new Error(`Invalid filename: ${file.filename}`);
            }

            let destination = path.resolve(root, filename);

            try {
                fs.writeFileSync(destination, file.source, {
                    encoding: "utf8",
                    flag: "wx"
                });
            } catch (error) {
                if (error.code === "EEXIST") {
                    throw new Error(`File already exists: ${destination}`);
                }
                throw error;
            }

            savedFiles.push(destination);
        }

        return savedFiles;
    }

    loadJSON(filename, defaultValue = null) {
        try {
            const filePath = this._getFilePath(filename);

            if (!fs.existsSync(filePath)) {
                return defaultValue;
            }

            return JSON.parse(fs.readFileSync(filePath, "utf8"));
        } catch (error) {
            throw new Error(`Failed to load ${filename}: ${error.message}`);
        }
    }

    saveJSON(filename, data) {
        try {
            const filePath = this._getFilePath(filename);

            fs.mkdirSync(path.dirname(filePath), {
                recursive: true
            });

            fs.writeFileSync(
                filePath,
                JSON.stringify(data, null, 2),
                "utf8"
            );

            return filePath;
        } catch (error) {
            throw new Error(`Failed to save ${filename}: ${error.message}`);
        }
    }

    readPaths(paths, exclusions = []) {
        const results = [];

        for (const inputPath of paths) {
            const resolvedPath = path.resolve(inputPath);
            const relativePath = path.relative(process.cwd(), resolvedPath);

            try {
                if (!fs.existsSync(resolvedPath)) continue;

                const stat = fs.statSync(resolvedPath);
                const isDirectory = stat.isDirectory();

                if (this._matchesExclusion(relativePath, isDirectory, exclusions)) {
                    continue;
                }

                if (stat.isFile()) {
                    results.push({
                        filename: path.basename(resolvedPath),
                        path: resolvedPath,
                        content: fs.readFileSync(resolvedPath, "utf8")
                    });
                } else if (isDirectory) {
                    const children = this.readPaths(
                        fs.readdirSync(resolvedPath).map(name =>
                            path.join(resolvedPath, name)
                        ),
                        exclusions
                    );

                    results.push(...children);
                }
            } catch (error) {
                console.error(`[FileUtil] ${inputPath}: ${error.message}`);
            }
        }

        return results;
    }

    _globToRegex(pattern) {
        let regex = "";

        for (let i = 0; i < pattern.length; i++) {
            const char = pattern[i];
            const next = pattern[i + 1];

            if (char === "*" && next === "*") {
                regex += ".*";
                i++;
            } else if (char === "*") {
                regex += "[^/]*";
            } else if (char === "?") {
                regex += "[^/]";
            } else {
                regex += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
            }
        }

        return new RegExp(`^${regex}$`);
    }

    _matchesExclusion(relativePath, isDirectory, exclusions = []) {
        const normalizedPath = relativePath
            .split(path.sep)
            .join("/");

        const segments = normalizedPath.split("/");
        let excluded = false;

        for (let pattern of exclusions) {
            if (!pattern || pattern.startsWith("#")) continue;

            let negate = pattern.startsWith("!");

            if (negate) {
                pattern = pattern.substring(1);
            }

            pattern = pattern
                .replace(/\\/g, "/")
                .replace(/^\/+/, "");

            const directoryOnly = pattern.endsWith("/");
            pattern = pattern.replace(/\/+$/, "");

            if (!pattern) continue;

            const hasSlash = pattern.includes("/");
            const regex = this._globToRegex(pattern);

            let matched = false;

            for (let i = 0; i < segments.length; i++) {
                const candidate = segments.slice(0, i + 1).join("/");
                const isLast = i === segments.length - 1;
                const candidateIsDirectory = !isLast || isDirectory;

                if (directoryOnly && !candidateIsDirectory) continue;

                if (hasSlash) {
                    if (regex.test(candidate)) {
                        matched = true;
                        break;
                    }
                } else {
                    if (regex.test(segments[i])) {
                        matched = true;
                        break;
                    }
                }
            }

            if (matched) {
                excluded = !negate;
            }
        }

        return excluded;
    }

    _ensureDirectory() {
        fs.mkdirSync(this.baseDir, { recursive: true });
    }

    _getFilePath(filename) {
        return path.resolve(this.baseDir, filename);
    }
}

module.exports = FileUtil;
