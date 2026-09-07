const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const isWin = process.platform === "win32";
const venvPytest = isWin
  ? path.join(__dirname, ".venv", "Scripts", "pytest.exe")
  : path.join(__dirname, ".venv", "bin", "pytest");

const binary = fs.existsSync(venvPytest) ? venvPytest : "pytest";
const result = spawnSync(binary, process.argv.slice(2), {
  stdio: "inherit",
  shell: true,
  cwd: __dirname,
});

process.exit(result.status ?? 0);
