const crypto = require("crypto");

class IdUtil {
    static generate(length = 6) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let id = "";

        for (let i = 0; i < length; i++) {
            const index = crypto.randomInt(0, chars.length);
            id += chars[index];
        }

        return id;
    }
}

module.exports = IdUtil;