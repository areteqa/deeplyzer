
const fs = require("fs");
const path = require("path");

class SessionManager {

    static STATE = {
        NONE: "none",
        IN_PROGRESS: "in_progress",
        COMPLETED: "completed",
        ABORTED: "aborted"
    };

    static STAGES = {
        NONE: "none",
        FIND_EXCLUSIONS: "find_exclusions",
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
                state: this.STATE.IN_PROGRESS,
                currentStage: this.STAGES.NONE
            };
            this._writeSession();
            return this.session;
        }

        try {
            this.session = JSON.parse(
                fs.readFileSync(this.sessionFile, "utf8")
            );
        } catch (error) {
            throw new Error(`Failed to load session: ${error.message}`);
        }
    }

    static updateState(state) {
        if (!this.session) {
            this.loadSession();
        }

         this.session.state = state;

        this._writeSession();

        return this.session;
    }


    static updateStage(stage) {
        if (!this.session) {
            this.loadSession();
        }

         this.session.currentStage = stage;

        this._writeSession();

        return this.session;
    }

    static clearSession() {
        this.session = {
            state: this.STATE.NONE,
            currentStage: this.STAGES.NONE
        };
        this._writeSession();
        return this.session;
    }

    static checkStage(stage) {
        if (!this.session) {
            this.loadSession();
        }

        const stages = Object.values(this.STAGES);

        const stageIndex = stages.indexOf(stage);

        if (stageIndex === -1) {
            throw new Error(`Invalid stage: ${stage}`);
        }

        const lastCompletedIndex = stages.indexOf(this.session.currentStage);

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

    static getStageList() {
        return Object.values(this.STAGES);
    }
}

module.exports = SessionManager;
