const fs = require("fs");
const path = require("path");

class PromptsUtil {
    static read(name) {
        const promptsDir = path.join(process.cwd(), "prompts");

        if (!fs.existsSync(promptsDir)) {
            throw new Error(`Prompts directory not found: ${promptsDir}`);
        }

        const files = fs.readdirSync(promptsDir);

        const matchedFiles = files.filter(file => {
            const filePath = path.join(promptsDir, file);

            return (
                fs.statSync(filePath).isFile() &&
                path.parse(file).name === name
            );
        });

        return matchedFiles
            .map(file => fs.readFileSync(path.join(promptsDir, file), "utf-8"))
            .join("\n");
    }
}

module.exports = PromptsUtil;