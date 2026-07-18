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

interface FileListItem {
  name: string;
  updatedAt: string;
}

interface SolutionFolder {
  name: string;
  files: FileListItem[];
  updatedAt: string;
}

export async function ensureDir() {
  await fs.mkdir(FILES_DIR, { recursive: true });
}

// --- Solution/Folder Operations ---

export async function listSolutions(): Promise<SolutionFolder[]> {
  await ensureDir();
  const entries = await fs.readdir(FILES_DIR, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith("."));
  const solutions: SolutionFolder[] = [];

  for (const dir of dirs) {
    const solutionPath = path.join(FILES_DIR, dir.name);
    const files = await listFilesInSolution(dir.name);
    let updatedAt = "";

    if (files.length > 0) {
      updatedAt = files[0].updatedAt;
    } else {
      try {
        const slnStat = await fs.stat(path.join(solutionPath, `${dir.name}.sln`));
        updatedAt = slnStat.mtime.toISOString();
      } catch {}
    }

    solutions.push({ name: dir.name, files, updatedAt });
  }

  return solutions.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function createSolution(name: string): Promise<void> {
  const cleanName = name.trim().replace(/[^a-zA-Z0-9_]/g, "");
  if (!cleanName) throw new Error("Invalid solution name");

  const solutionPath = path.join(FILES_DIR, cleanName);
  await fs.mkdir(solutionPath, { recursive: true });

  const slnContent = generateSlnFile(cleanName, []);
  await fs.writeFile(path.join(solutionPath, `${cleanName}.sln`), slnContent, "utf-8");
}

export async function deleteSolution(name: string): Promise<void> {
  const solutionPath = path.join(FILES_DIR, name);
  await fs.rm(solutionPath, { recursive: true, force: true });
}

export async function renameSolution(oldName: string, newName: string): Promise<void> {
  const cleanName = newName.trim().replace(/[^a-zA-Z0-9_]/g, "");
  if (!cleanName) throw new Error("Invalid solution name");

  const oldPath = path.join(FILES_DIR, oldName);
  const newPath = path.join(FILES_DIR, cleanName);

  try {
    await fs.access(newPath);
    throw new Error("A solution with that name already exists");
  } catch (e: any) {
    if (e.code !== "ENOENT") throw e;
  }

  await fs.rename(oldPath, newPath);

  const oldSlnPath = path.join(newPath, `${oldName}.sln`);
  const newSlnPath = path.join(newPath, `${cleanName}.sln`);
  try {
    await fs.rename(oldSlnPath, newSlnPath);
  } catch {}

  const oldCsprojPath = path.join(newPath, `${oldName}.csproj`);
  const newCsprojPath = path.join(newPath, `${cleanName}.csproj`);
  try {
    await fs.rename(oldCsprojPath, newCsprojPath);
  } catch {}
}

// --- File Operations (within a solution) ---

export async function listFilesInSolution(solutionName: string): Promise<FileListItem[]> {
  const solutionPath = path.join(FILES_DIR, solutionName);

  try {
    const entries = await fs.readdir(solutionPath, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith("."));
    const results: FileListItem[] = [];

    for (const dir of dirs) {
      try {
        const metaPath = path.join(solutionPath, dir.name, "meta.json");
        const meta = JSON.parse(await fs.readFile(metaPath, "utf-8"));
        results.push({ name: dir.name, updatedAt: meta.updatedAt });
      } catch {
        results.push({ name: dir.name, updatedAt: "" });
      }
    }

    return results.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch {
    return [];
  }
}

export async function getFile(solutionName: string, fileName: string): Promise<FileEntry | null> {
  const dirPath = path.join(FILES_DIR, solutionName, fileName);
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

    return { name: fileName, code, testCases, createdAt, updatedAt };
  } catch {
    return null;
  }
}

export async function saveFile(
  solutionName: string,
  fileName: string,
  code: string,
  testCases: TestCase[] = []
): Promise<void> {
  const dirPath = path.join(FILES_DIR, solutionName, fileName);
  await fs.mkdir(dirPath, { recursive: true });

  const mainPath = path.join(dirPath, "Main.cs");
  const csprojPath = path.join(dirPath, `${fileName}.csproj`);
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
        name: fileName,
        testCases,
        createdAt: existingMeta.createdAt || now,
        updatedAt: now,
      },
      null,
      2
    ),
    "utf-8"
  );

  await updateSlnFile(solutionName);
}

export async function deleteFile(solutionName: string, fileName: string): Promise<void> {
  const dirPath = path.join(FILES_DIR, solutionName, fileName);
  await fs.rm(dirPath, { recursive: true, force: true });
  await updateSlnFile(solutionName);
}

// --- Migration ---

export async function migrateFlatFiles(): Promise<void> {
  await ensureDir();
  const entries = await fs.readdir(FILES_DIR, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith("."));

  let needsMigration = false;
  for (const dir of dirs) {
    const mainCs = path.join(FILES_DIR, dir.name, "Main.cs");
    try {
      await fs.access(mainCs);
      needsMigration = true;
      break;
    } catch {}
  }

  if (!needsMigration) return;

  console.log("Migrating existing files to solution structure...");

  const defaultSolution = "Default";
  const defaultPath = path.join(FILES_DIR, defaultSolution);
  await fs.mkdir(defaultPath, { recursive: true });

  for (const dir of dirs) {
    const oldPath = path.join(FILES_DIR, dir.name);
    const mainCs = path.join(oldPath, "Main.cs");

    try {
      await fs.access(mainCs);
      const newPath = path.join(defaultPath, dir.name);
      await fs.rename(oldPath, newPath);
      console.log(`  Migrated: ${dir.name} -> Default/${dir.name}`);
    } catch {}
  }

  const slnContent = generateSlnFile(defaultSolution, []);
  await fs.writeFile(path.join(defaultPath, `${defaultSolution}.sln`), slnContent, "utf-8");

  console.log("Migration complete!");
}

// --- .sln File Generation ---

function generateGuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateSlnFile(solutionName: string, projectNames: string[]): string {
  const lines: string[] = [
    "",
    "Microsoft Visual Studio Solution File, Format Version 12.00",
    "# Visual Studio Version 17",
    "VisualStudioVersion = 17.0.31903.59",
    "MinimumVisualStudioVersion = 10.0.40219.1",
  ];

  const projectGuids: string[] = [];

  for (const projName of projectNames) {
    const projectGuid = generateGuid();
    projectGuids.push(projectGuid);
    lines.push(
      `Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "${projName}", "${projName}\\${projName}.csproj", "{${projectGuid}}"`
    );
    lines.push("EndProject");
  }

  lines.push("Global");

  lines.push("\tGlobalSection(SolutionConfigurationPlatforms) = preSolution");
  lines.push("\t\tDebug|Any CPU = Debug|Any CPU");
  lines.push("\t\tRelease|Any CPU = Release|Any CPU");
  lines.push("\tEndGlobalSection");

  lines.push("\tGlobalSection(ProjectConfigurationPlatforms) = postSolution");
  for (const guid of projectGuids) {
    lines.push(`\t\t{${guid}}.Debug|Any CPU.ActiveCfg = Debug|Any CPU`);
    lines.push(`\t\t{${guid}}.Debug|Any CPU.Build.0 = Debug|Any CPU`);
    lines.push(`\t\t{${guid}}.Release|Any CPU.ActiveCfg = Release|Any CPU`);
    lines.push(`\t\t{${guid}}.Release|Any CPU.Build.0 = Release|Any CPU`);
  }
  lines.push("\tEndGlobalSection");

  lines.push("EndGlobal");
  lines.push("");

  return lines.join("\r\n");
}

async function updateSlnFile(solutionName: string): Promise<void> {
  const solutionPath = path.join(FILES_DIR, solutionName);
  const slnPath = path.join(solutionPath, `${solutionName}.sln`);

  try {
    const entries = await fs.readdir(solutionPath, { withFileTypes: true });
    const projectDirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith("."));
    const projectNames = projectDirs.map((d) => d.name);

    const slnContent = generateSlnFile(solutionName, projectNames);
    await fs.writeFile(slnPath, slnContent, "utf-8");
  } catch {}
}


