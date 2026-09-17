const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const instagramFeed = require("./api/instagram-feed");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "outputs");
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function createApiResponse(res) {
  return {
    setHeader: (name, value) => res.setHeader(name, value),
    status: (statusCode) => ({
      json: (payload) => sendJson(res, statusCode, payload),
      end: () => {
        res.statusCode = statusCode;
        res.end();
      },
    }),
  };
}

function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = requestUrl.pathname === "/" ? "/index.html" : decodeURIComponent(requestUrl.pathname);
  const filePath = path.normalize(path.join(PUBLIC_DIR, pathname));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, { "Content-Type": MIME_TYPES[path.extname(filePath)] || "application/octet-stream" });
    res.end(contents);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/instagram-feed")) {
    instagramFeed(req, createApiResponse(res));
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Factor Lambda web: http://localhost:${PORT}`);
});
