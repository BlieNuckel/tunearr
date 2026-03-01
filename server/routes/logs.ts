import type { Request, Response } from "express";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type LogLevel = "debug" | "info" | "warn" | "error";

type LogEntry = {
  timestamp: string;
  level: LogLevel;
  label: string;
  message: string;
  data?: unknown;
};

type LogsResponse = {
  logs: LogEntry[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

const router = express.Router();

const LOG_DIR =
  process.env.APP_CONFIG_DIR || path.join(__dirname, "..", "..", "config");
const JSON_LOG_PATH = path.join(LOG_DIR, "logs", "tunearr.json");

router.get("/", (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const requestedPageSize = parseInt(req.query.pageSize as string) || 25;
  const pageSize = Math.min(100, Math.max(1, requestedPageSize)); // Max 100, min 1
  const level = req.query.level as LogLevel | undefined;
  const search = req.query.search as string | undefined;

  // Return empty array if file doesn't exist
  if (!fs.existsSync(JSON_LOG_PATH)) {
    const emptyResponse: LogsResponse = {
      logs: [],
      page,
      pageSize,
      totalCount: 0,
      totalPages: 0,
    };
    return res.json(emptyResponse);
  }

  try {
    // Read and parse newline-delimited JSON
    const fileContent = fs.readFileSync(JSON_LOG_PATH, "utf-8");
    const lines = fileContent.trim().split("\n");
    const allLogs: LogEntry[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const log = JSON.parse(line) as LogEntry;
        allLogs.push(log);
      } catch {
        // Skip invalid JSON lines silently
        continue;
      }
    }

    // Filter by level if specified
    let filtered = allLogs;
    if (level) {
      filtered = filtered.filter((log) => log.level === level);
    }

    // Filter by search if specified (case-insensitive, matches message or label)
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.message.toLowerCase().includes(searchLower) ||
          log.label.toLowerCase().includes(searchLower)
      );
    }

    // Reverse order (newest first)
    filtered.reverse();

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Paginate
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedLogs = filtered.slice(startIndex, endIndex);

    const response: LogsResponse = {
      logs: paginatedLogs,
      page,
      pageSize,
      totalCount,
      totalPages,
    };

    res.json(response);
  } catch {
    res.status(500).json({ error: "Failed to read logs" });
  }
});

export default router;
