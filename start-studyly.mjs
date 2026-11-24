import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = path.dirname(fileURLToPath(import.meta.url));
const url = "http://localhost:3000/";

async function serverReady() {
  try {
    const response = await fetch(url + "api/auth/session", { signal: AbortSignal.timeout(1200) });
    return response.ok;
  } catch { return false; }
}

function openBrowser() {
  // Pass "start", its empty window title and the URL as separate arguments. Node quotes each one correctly;
  // building one pre-quoted string made Windows receive escaped quotes and report that it cannot find '\\'.
  const child = spawn("cmd.exe", ["/d", "/c", "start", "", url], { detached: true, stdio: "ignore", windowsHide: true });
  child.unref();
}

if (await serverReady()) {
  console.log("Studyly is already running. Opening it in your browser.");
  openBrowser();
  process.exit(0);
}

console.log("Starting Studyly. Keep this window open while you use the site.");
const server = spawn(process.execPath, ["server.mjs"], { cwd: projectDir, stdio: "inherit" });
let ready = false;
for (let attempt = 0; attempt < 30; attempt++) {
  await delay(500);
  if (await serverReady()) { ready = true; break; }
  if (server.exitCode !== null) break;
}
if (!ready) {
  console.error("Studyly did not start. Check the message above. If port 3000 is already in use, stop the other Studyly server and try again.");
  server.kill();
  process.exitCode = 1;
} else {
  console.log("Studyly is ready at http://localhost:3000/");
  openBrowser();
  await new Promise(resolve => server.once("exit", resolve));
}
