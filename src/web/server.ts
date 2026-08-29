import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { runTaskFromGoal } from "../task-runner";

const PORT = Number(process.env.PORT || 3000);

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

        const task = await runTaskFromGoal(goal, artifacts);
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
