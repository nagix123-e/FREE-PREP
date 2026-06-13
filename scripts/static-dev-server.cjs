const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "dist");
const host = "127.0.0.1";
const port = 1420;

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".wasm", "application/wasm"]
]);

if (!fs.existsSync(path.join(root, "index.html"))) {
  console.error("dist/index.html was not found. Run npm run build when the build toolchain is stable.");
  process.exit(1);
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${host}:${port}`);
  const requestedPath = decodeURIComponent(url.pathname);
  const relativePath = requestedPath === "/" ? "index.html" : requestedPath.replace(/^\/+/, "");
  const filePath = path.resolve(root, relativePath);
  const safePath = filePath.startsWith(root) ? filePath : path.join(root, "index.html");
  const finalPath = fs.existsSync(safePath) && fs.statSync(safePath).isFile()
    ? safePath
    : path.join(root, "index.html");

  response.setHeader("Content-Type", mimeTypes.get(path.extname(finalPath)) || "application/octet-stream");
  fs.createReadStream(finalPath).pipe(response);
});

server.on("error", (error) => {
  if (error && error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Stop the existing process with: lsof -tiTCP:${port} -sTCP:LISTEN | xargs kill -9`);
    process.exit(1);
  }
  throw error;
});

server.listen(port, host, () => {
  console.log(`Static dev server ready at http://${host}:${port}/`);
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));
