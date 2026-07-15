import fs from "fs/promises";
import path from "path";

const FILES_DIR = process.env.FILES_DIR || path.join(process.cwd(), "files");

interface TestCase {
  input: string;
  expectedOutput: string;
}

interface FileEntry {
  name: string;
  code: string;
  testCases: TestCase[];
  createdAt: string;
  updatedAt: string;
}

export async function ensureDir() {
  await fs.mkdir(FILES_DIR, { recursive: true });
}

export async function listFiles(): Promise<{ name: string; updatedAt: string }[]> {
  await ensureDir();
  const entries = await fs.readdir(FILES_DIR, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith("."));
  const results: { name: string; updatedAt: string }[] = [];

  for (const dir of dirs) {
    try {
      const metaPath = path.join(FILES_DIR, dir.name, "meta.json");
      const meta = JSON.parse(await fs.readFile(metaPath, "utf-8"));
      results.push({ name: dir.name, updatedAt: meta.updatedAt });
    } catch {
      results.push({ name: dir.name, updatedAt: "" });
    }
  }

  return results.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getFile(name: string): Promise<FileEntry | null> {
  const dirPath = path.join(FILES_DIR, name);
  const mainPath = path.join(dirPath, "Main.cs");
  const metaPath = path.join(dirPath, "meta.json");

  try {
    const code = await fs.readFile(mainPath, "utf-8");
    let testCases: TestCase[] = [];
    let createdAt = "";
    let updatedAt = "";

    try {
      const meta = JSON.parse(await fs.readFile(metaPath, "utf-8"));
      testCases = meta.testCases || [];
      createdAt = meta.createdAt || "";
      updatedAt = meta.updatedAt || "";
    } catch {}

    return { name, code, testCases, createdAt, updatedAt };
  } catch {
    return null;
  }
}

export async function saveFile(
  name: string,
  code: string,
  testCases: TestCase[] = []
): Promise<void> {
  const dirPath = path.join(FILES_DIR, name);
  await fs.mkdir(dirPath, { recursive: true });

  const mainPath = path.join(dirPath, "Main.cs");
  const csprojPath = path.join(dirPath, `${name}.csproj`);
  const metaPath = path.join(dirPath, "meta.json");

  const now = new Date().toISOString();

  let existingMeta: any = {};
  try {
    existingMeta = JSON.parse(await fs.readFile(metaPath, "utf-8"));
  } catch {}

  await fs.writeFile(mainPath, code, "utf-8");

  await fs.writeFile(
    csprojPath,
    `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>
`,
    "utf-8"
  );

  await fs.writeFile(
    metaPath,
    JSON.stringify(
      {
        name,
        testCases,
        createdAt: existingMeta.createdAt || now,
        updatedAt: now,
      },
      null,
      2
    ),
    "utf-8"
  );
}

export async function deleteFile(name: string): Promise<void> {
  const dirPath = path.join(FILES_DIR, name);
  await fs.rm(dirPath, { recursive: true, force: true });
}
