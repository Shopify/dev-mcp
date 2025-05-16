import { mkdir, readFile, writeFile } from "fs/promises";
import { homedir } from "os";
import { constants } from "fs";
import { access } from "fs/promises";
import { v4 } from "uuid";
import path from "path";
import pkg from "../package.json" with { type: "json" };

const CONFIG_DIR_NAME = ".shopify-dev-mcp";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const configDir = path.join(homedir(), CONFIG_DIR_NAME);
const installationIdPath = path.join(configDir, "installation-id");
const sessionPath = path.join(configDir, "session.json");
const packageVersion = pkg.version;

interface InstrumentationData {
  installationId: string;
  sessionId: string;
  packageVersion: string;
  timestamp: string;
}

interface SessionData {
  sessionId: string;
  lastRefreshed: string;
}

/**
 * Checks if instrumentation is enabled in package.json config
 */
function isInstrumentationEnabled(): boolean {
  try {
    const packageJson = JSON.parse(process.env.npm_package_json || "{}");
    return packageJson?.config?.instrumentation !== false;
  } catch (error) {
    // If we can't read the config, default to enabled
    return true;
  }
}

/**
 * Ensures the config directory exists and is writable
 * Returns true if the directory is ready for use, false otherwise
 */
async function ensureConfigDirectory(): Promise<boolean> {
  try {
    await mkdir(configDir, { recursive: true });
    await access(configDir, constants.W_OK);
    return true;
  } catch (error) {
    console.error(
      `Config directory error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}

/**
 * Gets the installation ID for this package installation.
 * Never throws. Will return a memory-based ID if file operations fail.
 */
async function getInstallationId(): Promise<string> {
  try {
    if (!(await ensureConfigDirectory())) {
      return v4();
    }

    try {
      const existingId = await readFile(installationIdPath, "utf-8");
      if (existingId) {
        return existingId;
      }
    } catch (error) {
      return v4();
    }

    const newId = v4();
    try {
      await writeFile(installationIdPath, newId, "utf-8");
      return newId;
    } catch (error) {
      return v4();
    }
  } catch (error) {
    return v4();
  }
}

/**
 * Gets the current session ID, creating a new one if needed
 * Never throws. Will return a memory-based session if file operations fail.
 */
async function getSessionId(): Promise<string> {
  try {
    if (!(await ensureConfigDirectory())) {
      return v4();
    }

    try {
      const sessionData = JSON.parse(await readFile(sessionPath, "utf-8"));
      if (sessionData?.sessionId && sessionData?.lastRefreshed) {
        const lastRefreshed = new Date(sessionData.lastRefreshed);
        if (Date.now() - lastRefreshed.getTime() < SESSION_DURATION_MS) {
          // Refresh the session in the background
          refreshSession().catch(() => {});
          return sessionData.sessionId;
        }
      }
    } catch (error) {
      return await createNewSession();
    }

    return await createNewSession();
  } catch (error) {
    return await createNewSession();
  }
}

/**
 * Creates a new session and stores it
 * Never throws. Will return a memory-based session if file operations fail.
 */
async function createNewSession(): Promise<string> {
  try {
    if (!(await ensureConfigDirectory())) {
      return v4();
    }

    const newSessionId = v4();
    const sessionData = {
      sessionId: newSessionId,
      lastRefreshed: new Date().toISOString(),
    };

    try {
      await writeFile(
        sessionPath,
        JSON.stringify(sessionData, null, 2),
        "utf-8",
      );
      return newSessionId;
    } catch (error) {
      return v4();
    }
  } catch (error) {
    return v4();
  }
}

/**
 * Refreshes the current session timestamp
 * Never throws. Fails silently if refresh isn't possible.
 */
async function refreshSession(): Promise<void> {
  try {
    const sessionData = JSON.parse(
      await readFile(sessionPath, "utf-8"),
    ) as SessionData;
    if (!sessionData?.sessionId) {
      throw new Error("Invalid session data");
    }

    sessionData.lastRefreshed = new Date().toISOString();
    await writeFile(sessionPath, JSON.stringify(sessionData, null, 2), "utf-8");
  } catch (error) {
    // Silently create new session on any error
    await createNewSession();
  }
}

/**
 * Gets instrumentation information including installation ID, session ID, and package version
 * Never throws. Always returns valid instrumentation data.
 */
export async function instrumentationData(): Promise<InstrumentationData> {
  // If instrumentation is disabled, return empty strings
  if (!isInstrumentationEnabled()) {
    return {
      installationId: "",
      sessionId: "",
      packageVersion: packageVersion,
      timestamp: new Date().toISOString(),
    };
  }

  const [installationId, sessionId] = await Promise.all([
    getInstallationId(),
    getSessionId(),
  ]);

  return {
    installationId,
    sessionId,
    packageVersion: packageVersion,
    timestamp: new Date().toISOString(),
  };
}
