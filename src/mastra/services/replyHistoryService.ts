import fs from "fs/promises";
import path from "path";

const STORAGE_DIR = path.join(process.cwd(), "storage");
const HISTORY_FILE = path.join(STORAGE_DIR, "reply_history.json");

interface ReplyHistory {
    repliedThreads: Record<string, number>; // thread_ts -> timestamp
    userLastReplied: Record<string, number>; // user_id -> timestamp
}

export class ReplyHistoryService {
    private history: ReplyHistory = {
        repliedThreads: {},
        userLastReplied: {},
    };

    private async ensureStorage() {
        try {
            await fs.mkdir(STORAGE_DIR, { recursive: true });
        } catch (error) {
            // Ignore if exists
        }
    }

    private async load() {
        await this.ensureStorage();
        try {
            const data = await fs.readFile(HISTORY_FILE, "utf-8");
            this.history = JSON.parse(data);
        } catch (error) {
            // If file doesn't exist or is invalid, start fresh
            this.history = { repliedThreads: {}, userLastReplied: {} };
        }
    }

    private async save() {
        await this.ensureStorage();
        await fs.writeFile(HISTORY_FILE, JSON.stringify(this.history, null, 2));
    }

    async init() {
        await this.load();
    }

    async markReplied(threadTs: string, userId: string) {
        const now = Date.now();
        this.history.repliedThreads[threadTs] = now;
        this.history.userLastReplied[userId] = now;
        await this.save();
    }

    hasRepliedToThread(threadTs: string): boolean {
        return !!this.history.repliedThreads[threadTs];
    }

    shouldReplyToUser(userId: string, coolDownHours: number = 24): boolean {
        const lastReplied = this.history.userLastReplied[userId];
        if (!lastReplied) return true;

        const now = Date.now();
        const diffHours = (now - lastReplied) / (1000 * 60 * 60);
        return diffHours >= coolDownHours;
    }

    // Cleanup old history to prevent infinite growth (optional, keep simple for now)
}

export const replyHistoryService = new ReplyHistoryService();
