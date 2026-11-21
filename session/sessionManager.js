
const fs = require("fs");
const path = require("path");

class SessionManager {

    static STATUS = {
        NONE: "none",
        IN_PROGRESS: "in_progress",
        COMPLETED: "completed",
        ABORTED: "aborted"
    };

    static STAGES = {
        NONE: "none",
        BUILD_NODES: "build_nodes",
        CONNECT_EDGES: "connect_edges",
        BUILD_WORKFLOWS: "build_workflows",
        STATIC_ANALYSIS: "static_analysis",
        DEEP_ANALYSIS: "deep_analysis",
    };

    static session = null;

    static baseDir = path.join(process.cwd(), ".deeplyzer");
    static sessionFile = path.join(SessionManager.baseDir, "session.json");

    static _ensureDirectory() {
        fs.mkdirSync(this.baseDir, { recursive: true });
    }

    static loadSession() {
        this._ensureDirectory();

        if (!fs.existsSync(this.sessionFile)) {
            this.session = {
                status: this.STATUS.IN_PROGRESS,
                currentStage: this.STAGES.NONE,
            };
            this._writeSession();
            return this.session;
        }

        try {
            this.session = JSON.parse(
                fs.readFileSync(this.sessionFile, "utf8")
            );

            return this.session;

        } catch (error) {
            throw new Error(`Failed to load session: ${error.message}`);
        }
    }

    static updateSession(state = {}) {
        if (!this.session) {
            this.loadSession();
        }

        this.session = {
            ...this.session,
            ...state
        };

        this._writeSession();

        return this.session;
    }

    static clearSession() {
        this.session = {
            status: this.STATUS.NONE,
            currentStage: this.STAGES.NONE
        };

        this._writeSession();
        return this.session;
    }

    static checkStage(stage) {
        if (!this.session) {
            this.loadSession();
        }

        const stageIndex = this.STAGES.indexOf(stage);

        if (stageIndex === -1) {
            throw new Error(`Invalid stage: ${stage}`);
        }

        const lastCompletedIndex = Math.max(
            ...this.session.stages.map(s => this.STAGES.indexOf(s)),
            -1
        );

        return stageIndex > lastCompletedIndex;
    }

    static _writeSession() {
        this._ensureDirectory();

        fs.writeFileSync(
            this.sessionFile,
            JSON.stringify(this.session, null, 4),
            "utf8"
        );
    }
}

module.exports = SessionManager;
