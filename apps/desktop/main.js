// Luminary AI desktop shell.
//
// Opens the existing Next.js app in a native window. On launch it makes sure the
// local web server (and FastAPI API) are running: if they are already up it just
// attaches, otherwise it starts them and shuts them down again on quit.

const { app, BrowserWindow, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const WEB_URL = process.env.LUMINARY_WEB_URL || "http://localhost:3000";
// Optional deep-link for demos (e.g. reel export desktop mock).
const START_PATH = process.env.LUMINARY_START_PATH || "";
const START_URL = START_PATH
  ? `${WEB_URL.replace(/\/$/, "")}${START_PATH.startsWith("/") ? "" : "/"}${START_PATH}`
  : WEB_URL;
const API_HEALTH_URL =
  (process.env.LUMINARY_API_URL || "http://localhost:8000") + "/health";
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const API_DIR = path.join(REPO_ROOT, "apps", "api");
const IS_WIN = process.platform === "win32";
const START_BACKENDS = process.env.LUMINARY_START_BACKENDS !== "0";
const START_API = process.env.LUMINARY_START_API !== "0";

/** @type {import('node:child_process').ChildProcess[]} */
const children = [];
let mainWindow = null;

function ping(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode !== undefined && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function spawnProc(label, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    shell: IS_WIN,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (d) => process.stdout.write(`[${label}] ${d}`));
  child.stderr.on("data", (d) => process.stderr.write(`[${label}] ${d}`));
  child.on("error", (err) => console.error(`[${label}] failed to start:`, err.message));
  child.on("exit", (code) => console.log(`[${label}] exited with code ${code}`));
  children.push(child);
}

function uvicornPath() {
  return IS_WIN
    ? path.join(API_DIR, ".venv", "Scripts", "uvicorn.exe")
    : path.join(API_DIR, ".venv", "bin", "uvicorn");
}

async function ensureBackends() {
  if (!START_BACKENDS) return;

  if (!(await ping(WEB_URL))) {
    const pnpm = IS_WIN ? "pnpm.cmd" : "pnpm";
    console.log("[desktop] starting web dev server…");
    spawnProc("web", pnpm, ["--filter", "web", "dev"], REPO_ROOT);
  } else {
    console.log("[desktop] web already running — attaching.");
  }

  if (START_API && !(await ping(API_HEALTH_URL))) {
    const uv = uvicornPath();
    if (fs.existsSync(uv)) {
      console.log("[desktop] starting FastAPI…");
      spawnProc(
        "api",
        uv,
        ["app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        API_DIR,
      );
    } else {
      console.warn(
        "[desktop] FastAPI venv not found. Create it with:\n" +
          "  cd apps/api && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt",
      );
    }
  } else if (START_API) {
    console.log("[desktop] API already running — attaching.");
  }
}

async function waitForWeb(timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await ping(WEB_URL)) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    title: "Luminary AI",
    backgroundColor: "#f4f7fb",
    webPreferences: { contextIsolation: true },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  // Open any external (non-app) links in the user's real browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(WEB_URL)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  const ready = await waitForWeb();
  if (ready) {
    await mainWindow.loadURL(START_URL);
  } else {
    await mainWindow.loadURL(
      "data:text/html," +
        encodeURIComponent(
          "<h2 style='font-family:sans-serif;padding:2rem'>Couldn't reach the web server on localhost:3000.<br/>Start it with <code>pnpm dev:web</code> and reopen.</h2>",
        ),
    );
  }
}

app.whenReady().then(async () => {
  await ensureBackends();
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  for (const child of children) {
    try {
      child.kill();
    } catch {
      // ignore
    }
  }
});
