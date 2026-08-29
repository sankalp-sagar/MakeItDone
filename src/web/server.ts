import "dotenv/config";

import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { runTaskFromGoal } from "../task-runner";
import { Supervisor } from "../supervisor/supervisor";
import { CapabilityRegistry } from "../capabilities/registry";
import { Executor } from "../supervisor/executor";
import { RiskEngine } from "../safety/risk-engine";
import type { TaskState } from "../supervisor/state";

const PORT = Number(process.env.PORT || 3000);

// Simple in-memory session store: sessionId → active task
const sessions = new Map<string, TaskState>();

function getSessionId(req: http.IncomingMessage): string {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/sessionId=([^;]+)/);
  if (match) {
    return match[1];
  }
  return "";
}

function setSessionCookie(res: http.ServerResponse, sessionId: string): void {
  res.setHeader("Set-Cookie", `sessionId=${sessionId}; Path=/; HttpOnly; Max-Age=3600`);
}

const mimeTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

async function serveFile(filePath: string): Promise<{ mime: string; body: Buffer }> {
  const fullPath = path.resolve(filePath);
  const body = await fs.readFile(fullPath);
  const extension = path.extname(fullPath).toLowerCase();
  return { mime: mimeTypes[extension] || "application/octet-stream", body };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://localhost");

  if (req.method === "GET" && url.pathname === "/") {
    const { mime, body } = await serveFile(path.join(__dirname, "index.html"));
    res.writeHead(200, { "Content-Type": mime });
    res.end(body);
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/files/")) {
    const fileName = decodeURIComponent(url.pathname.replace("/files/", ""));
    const filePath = path.join(process.cwd(), "uploads", fileName);
    try {
      const body = await fs.readFile(filePath);
      res.writeHead(200, { "Content-Type": "image/jpeg" });
      res.end(body);
    } catch {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "File not found" }));
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/task") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}") as {
          goal?: string;
          files?: Array<{ name: string; type?: string; contentBase64?: string }>;
        };

        const goal = payload.goal?.trim() || "Process the attached files";
        const sessionId = getSessionId(req);
        const existingTask = sessionId ? sessions.get(sessionId) : null;

        let task: TaskState;

        if (
          sessionId &&
          existingTask &&
          existingTask.artifacts.length > 0 &&
          /where\s+(is|are)\s+(it|the\s*file|that|this)/i.test(goal)
        ) {
          const latestArtifact = existingTask.artifacts[existingTask.artifacts.length - 1];
          const location = latestArtifact.path || latestArtifact.name;
          task = {
            ...existingTask,
            goal,
            status: "completed",
            pendingQuestions: [],
            observations: [
              ...(existingTask.observations ?? []),
              {
                id: crypto.randomUUID(),
                type: "information",
                message: `Last file created at: ${location}`,
                data: { file: location },
              },
            ],
          };
        } else if (existingTask && existingTask.status === "waiting_for_user" && existingTask.pendingQuestions.length > 0) {
          // Resume existing task with user's answer
          const registry = new CapabilityRegistry();
          registry.register({
            id: "read_file",
            name: "Read File",
            description: "Read the contents of a text file.",
            category: "observation",
            risk: "none",
            reversible: true,
            requiresApproval: false,
          });
          registry.register({
            id: "inspect_directory",
            name: "Inspect Directory",
            description: "List files and directories available in a location.",
            category: "observation",
            risk: "none",
            reversible: true,
            requiresApproval: false,
          });
          registry.register({
            id: "inspect_image",
            name: "Inspect Image",
            description: "Get metadata about an image file (dimensions, format, colors).",
            category: "observation",
            risk: "none",
            reversible: true,
            requiresApproval: false,
          });
          registry.register({
            id: "run_python",
            name: "Run Python",
            description: "Execute Python code.",
            category: "execution",
            risk: "low",
            reversible: true,
            requiresApproval: false,
          });
          registry.register({
            id: "process_image",
            name: "Process Image",
            description: "Transform an image file and produce a new image artifact.",
            category: "execution",
            risk: "low",
            reversible: true,
            requiresApproval: false,
          });
          registry.register({
            id: "modify_file",
            name: "Modify File",
            description: "Create or modify a file.",
            category: "execution",
            risk: "low",
            reversible: true,
            requiresApproval: false,
          });
          registry.register({
            id: "delete_file",
            name: "Delete File",
            description: "Delete a file from the filesystem.",
            category: "execution",
            risk: "high",
            reversible: false,
            requiresApproval: true,
          });
          registry.register({
            id: "run_tests",
            name: "Run Tests",
            description: "Discover and report on test files in the project.",
            category: "observation",
            risk: "none",
            reversible: true,
            requiresApproval: false,
          });
          registry.register({
            id: "inspect_logs",
            name: "Inspect Logs",
            description: "Read and analyze application log files.",
            category: "observation",
            risk: "none",
            reversible: true,
            requiresApproval: false,
          });

          const riskEngine = new RiskEngine();
          const executor = new Executor(registry, riskEngine);
          const supervisor = new Supervisor(executor, registry);

          const pendingQuestion = existingTask.pendingQuestions[0] || "Please continue";
          task = await supervisor.resumeTask(existingTask, pendingQuestion, goal);
        } else {
          // Start new task
          const artifacts = (payload.files ?? []).map((file, index) => {
            const filePath = path.join(process.cwd(), "uploads", `${Date.now()}-${index}-${file.name}`);
            const out = Buffer.from(file.contentBase64 || "", "base64");
            fs.mkdir(path.dirname(filePath), { recursive: true }).catch(() => undefined);
            fs.writeFile(filePath, out).catch(() => undefined);

            const artifactType = file.type?.startsWith("image/") ? "image" : "document";

            return {
              id: crypto.randomUUID(),
              name: file.name,
              type: artifactType as "image" | "document" | "code" | "data" | "unknown",
              path: filePath,
              source: "user" as const,
            };
          });

          task = await runTaskFromGoal(goal, artifacts);
        }

        // Store task in session
        const newSessionId = sessionId || crypto.randomUUID().toString();
        sessions.set(newSessionId, task);
        setSessionCookie(res, newSessionId);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, task }, null, 2));
      } catch (error) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: String(error) }, null, 2));
      }
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`Web UI running at http://localhost:${PORT}`);
});
