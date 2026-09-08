const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const isWin = process.platform === "win32";
const venvUvicorn = isWin
  ? path.join(__dirname, ".venv", "Scripts", "uvicorn.exe")
  : path.join(__dirname, ".venv", "bin", "uvicorn");

const binary = fs.existsSync(venvUvicorn) ? venvUvicorn : "uvicorn";
const child = spawn(binary, ["app.main:app", "--reload", "--port", "8000"], {
  stdio: "inherit",
  shell: true,
  cwd: __dirname,
});

child.on("exit", (code) => process.exit(code ?? 0));
