import http from "node:http";

const PORT = Number(process.env.PORT ?? 3002);
const SESSION_COOKIE = "sf_session=mock; Path=/; HttpOnly; SameSite=Lax";

const respondJson = (res, status, payload, headers = {}) => {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(payload));
};

const notFound = (res) => respondJson(res, 404, { ok: false, error: "Not found" });

const handleRequest = (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const { pathname } = url;

  if (req.method === "POST" && (pathname === "/api/auth/register" || pathname === "/api/auth/login")) {
    return respondJson(res, 200, { ok: true }, { "Set-Cookie": SESSION_COOKIE });
  }

  if (pathname === "/api/progress") {
    if (req.method === "GET") {
      return respondJson(res, 200, { stateJson: null });
    }
    if (req.method === "POST") {
      return respondJson(res, 200, { ok: true });
    }
  }

  if (req.method === "GET") {
    if (pathname === "/api/content/items") {
      return respondJson(res, 200, { ok: true, items: [] });
    }
    if (pathname === "/api/content/scenarios") {
      return respondJson(res, 200, { ok: true, scenarios: [] });
    }
    if (pathname === "/api/content/exams") {
      return respondJson(res, 200, { ok: true, exams: [] });
    }
    if (pathname === "/api/content/questions") {
      return respondJson(res, 200, { ok: true, questions: [] });
    }
    if (pathname === "/api/content/incidents") {
      return respondJson(res, 200, { ok: true, incidents: [] });
    }
    if (pathname === "/api/content/quick-fixes") {
      return respondJson(res, 200, { ok: true, quickFixes: [] });
    }
  }

  return notFound(res);
};

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`Mock backend listening on http://127.0.0.1:${PORT}`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
