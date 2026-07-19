import fs from "fs/promises";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), "config.json");

interface AppConfig {
  storagePath: string;
}

function getDefaultStoragePath(): string {
  return process.env.FILES_DIR || path.join(process.cwd(), "files");
}

let cachedConfig: AppConfig | null = null;

export async function getConfig(): Promise<AppConfig> {
  if (cachedConfig) return cachedConfig;

  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf-8");
    cachedConfig = JSON.parse(raw);
  } catch {
    cachedConfig = { storagePath: getDefaultStoragePath() };
    await saveConfig(cachedConfig);
  }

  return cachedConfig!;
}

export async function getStoragePath(): Promise<string> {
  const config = await getConfig();
  return config.storagePath;
}

export async function updateConfig(patch: Partial<AppConfig>): Promise<AppConfig> {
  const config = await getConfig();
  const updated = { ...config, ...patch };
  await saveConfig(updated);
  cachedConfig = updated;
  return updated;
}

async function saveConfig(config: AppConfig): Promise<void> {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}
