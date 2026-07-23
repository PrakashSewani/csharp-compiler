import fs from "fs/promises";
import path from "path";
import { getStoragePath } from "./configService.js";
import { ExecutionMode, getRuntime, LanguageId } from "./runtimes.js";

export interface TestCase {
  input: string;
  expectedOutput: string;
}

export interface ProblemMetadata {
  schemaVersion: 2;
  name: string;
  languageId: LanguageId;
  runtimeId: string;
  sourceFileName: string;
  executionMode: ExecutionMode;
  scratchStdin: string;
  testCases: TestCase[];
  createdAt: string;
  updatedAt: string;
}

interface FileEntry extends ProblemMetadata {
  code: string;
  metadata: ProblemMetadata;
}

interface FileListItem {
  name: string;
  updatedAt: string;
  languageId: LanguageId;
  runtimeId: string;
  sourceFileName: string;
  executionMode: ExecutionMode;
}

interface SolutionFolder {
  name: string;
  files: FileListItem[];
  updatedAt: string;
}

export interface SaveFileInput {
  code: string;
  testCases?: TestCase[];
  languageId: LanguageId;
  runtimeId: string;
  sourceFileName: string;
  executionMode: ExecutionMode;
  scratchStdin?: string;
}

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/;
const SOURCE_FILE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;

export function assertIdentifier(value: string, label: string): string {
  if (!IDENTIFIER.test(value)) throw new Error(`Invalid ${label}`);
  return value;
}

function assertSourceFileName(value: string): string {
  if (!SOURCE_FILE.test(value) || path.basename(value) !== value) {
    throw new Error("Invalid sourceFileName");
  }
  return value;
}

function containedPath(root: string, ...segments: string[]): string {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, ...segments);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error("Path escapes storage root");
  }
  return resolved;
}

function normalizeTestCases(value: unknown): TestCase[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      input: typeof item.input === "string" ? item.input : "",
      expectedOutput: typeof item.expectedOutput === "string" ? item.expectedOutput : "",
    }));
}

function normalizeMetadata(name: string, raw: any, fallbackTimestamp = ""): ProblemMetadata {
  const languageId: LanguageId = raw?.languageId === "python" || raw?.languageId === "java"
    ? raw.languageId
    : "csharp";
  const defaults = languageId === "python"
    ? { runtimeId: "python-3", sourceFileName: "main.py" }
    : languageId === "java"
      ? { runtimeId: "java-21", sourceFileName: "Main.java" }
      : { runtimeId: "dotnet-8", sourceFileName: "Main.cs" };
  const runtimeId = typeof raw?.runtimeId === "string" ? raw.runtimeId : defaults.runtimeId;
  getRuntime(languageId, runtimeId);
  const sourceFileName = assertSourceFileName(
    typeof raw?.sourceFileName === "string" ? raw.sourceFileName : defaults.sourceFileName
  );
  const now = fallbackTimestamp || new Date().toISOString();

  return {
    schemaVersion: 2,
    name,
    languageId,
    runtimeId,
    sourceFileName,
    executionMode: raw?.executionMode === "tests" ? "tests" : "stdin",
    scratchStdin: typeof raw?.scratchStdin === "string" ? raw.scratchStdin : "",
    testCases: normalizeTestCases(raw?.testCases),
    createdAt: typeof raw?.createdAt === "string" && raw.createdAt ? raw.createdAt : now,
    updatedAt: typeof raw?.updatedAt === "string" && raw.updatedAt ? raw.updatedAt : now,
  };
}

async function readMetadata(problemDir: string, name: string): Promise<ProblemMetadata> {
  const metaPath = containedPath(problemDir, "meta.json");
  let raw: any = {};
  let timestamp = "";
  try {
    raw = JSON.parse(await fs.readFile(metaPath, "utf-8"));
  } catch {
    try { timestamp = (await fs.stat(problemDir)).mtime.toISOString(); } catch {}
  }
  const metadata = normalizeMetadata(name, raw, timestamp);
  if (raw?.schemaVersion !== 2 || JSON.stringify(raw) !== JSON.stringify(metadata)) {
    await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2), "utf-8");
  }
  return metadata;
}

export async function ensureDir(dir?: string): Promise<void> {
  const target = dir || (await getStoragePath());
  await fs.mkdir(target, { recursive: true });
}

export async function listSolutions(): Promise<SolutionFolder[]> {
  const filesDir = await getStoragePath();
  await ensureDir(filesDir);
  const entries = await fs.readdir(filesDir, { withFileTypes: true });
  const solutions: SolutionFolder[] = [];

  for (const entry of entries.filter((item) => item.isDirectory() && !item.name.startsWith("."))) {
    if (!IDENTIFIER.test(entry.name)) continue;
    const files = await listFilesInSolution(entry.name);
    let updatedAt = files[0]?.updatedAt || "";
    if (!updatedAt) {
      try { updatedAt = (await fs.stat(containedPath(filesDir, entry.name))).mtime.toISOString(); } catch {}
    }
    solutions.push({ name: entry.name, files, updatedAt });
  }

  return solutions.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export async function createSolution(name: string): Promise<void> {
  const cleanName = assertIdentifier(name.trim(), "solution name");
  const filesDir = await getStoragePath();
  await ensureDir(filesDir);
  const solutionPath = containedPath(filesDir, cleanName);
  await fs.mkdir(solutionPath, { recursive: false });
  await fs.writeFile(containedPath(solutionPath, `${cleanName}.sln`), generateSlnFile(cleanName, []), "utf-8");
}

export async function deleteSolution(name: string): Promise<void> {
  const filesDir = await getStoragePath();
  await fs.rm(containedPath(filesDir, assertIdentifier(name, "solution name")), { recursive: true, force: true });
}

export async function renameSolution(oldName: string, newName: string): Promise<void> {
  const filesDir = await getStoragePath();
  const oldSafeName = assertIdentifier(oldName, "solution name");
  const cleanName = assertIdentifier(newName.trim(), "solution name");
  const oldPath = containedPath(filesDir, oldSafeName);
  const newPath = containedPath(filesDir, cleanName);
  try {
    await fs.access(newPath);
    throw new Error("A solution with that name already exists");
  } catch (error: any) {
    if (error.code !== "ENOENT") throw error;
  }
  await fs.rename(oldPath, newPath);
  try {
    await fs.rename(
      containedPath(newPath, `${oldSafeName}.sln`),
      containedPath(newPath, `${cleanName}.sln`)
    );
  } catch {}
  await updateSlnFile(cleanName);
}

export async function listFilesInSolution(solutionName: string): Promise<FileListItem[]> {
  const filesDir = await getStoragePath();
  const solutionPath = containedPath(filesDir, assertIdentifier(solutionName, "solution name"));
  try {
    const entries = await fs.readdir(solutionPath, { withFileTypes: true });
    const results: FileListItem[] = [];
    for (const entry of entries.filter((item) => item.isDirectory() && !item.name.startsWith("."))) {
      if (!IDENTIFIER.test(entry.name)) continue;
      const metadata = await readMetadata(containedPath(solutionPath, entry.name), entry.name);
      results.push({
        name: entry.name,
        updatedAt: metadata.updatedAt,
        languageId: metadata.languageId,
        runtimeId: metadata.runtimeId,
        sourceFileName: metadata.sourceFileName,
        executionMode: metadata.executionMode,
      });
    }
    return results.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  } catch (error: any) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

export async function getFile(solutionName: string, fileName: string): Promise<FileEntry | null> {
  const filesDir = await getStoragePath();
  const solution = assertIdentifier(solutionName, "solution name");
  const file = assertIdentifier(fileName, "file name");
  const problemDir = containedPath(filesDir, solution, file);
  try {
    const metadata = await readMetadata(problemDir, file);
    const code = await fs.readFile(containedPath(problemDir, metadata.sourceFileName), "utf-8");
    return { ...metadata, code, metadata };
  } catch (error: any) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveFile(
  solutionName: string,
  fileName: string,
  input: SaveFileInput
): Promise<ProblemMetadata> {
  const filesDir = await getStoragePath();
  const solution = assertIdentifier(solutionName, "solution name");
  const file = assertIdentifier(fileName, "file name");
  const runtime = getRuntime(input.languageId, input.runtimeId);
  const sourceFileName = assertSourceFileName(input.sourceFileName);
  if (sourceFileName !== runtime.sourceFileName) {
    throw new Error(`sourceFileName must be ${runtime.sourceFileName} for ${runtime.runtimeId}`);
  }
  const solutionPath = containedPath(filesDir, solution);
  const problemDir = containedPath(solutionPath, file);
  await fs.mkdir(problemDir, { recursive: true });

  let existing: ProblemMetadata | null = null;
  try { existing = await readMetadata(problemDir, file); } catch {}
  const now = new Date().toISOString();
  const metadata: ProblemMetadata = {
    schemaVersion: 2,
    name: file,
    languageId: input.languageId,
    runtimeId: input.runtimeId,
    sourceFileName,
    executionMode: input.executionMode,
    scratchStdin: input.scratchStdin || "",
    testCases: normalizeTestCases(input.testCases),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await fs.writeFile(containedPath(problemDir, sourceFileName), input.code, "utf-8");
  if (existing && existing.sourceFileName !== sourceFileName) {
    await fs.rm(containedPath(problemDir, existing.sourceFileName), { force: true });
  }
  if (input.languageId === "csharp") {
    await fs.writeFile(containedPath(problemDir, `${file}.csproj`), csharpProjectFile(), "utf-8");
  } else {
    await fs.rm(containedPath(problemDir, `${file}.csproj`), { force: true });
  }
  await fs.writeFile(containedPath(problemDir, "meta.json"), JSON.stringify(metadata, null, 2), "utf-8");
  await updateSlnFile(solution);
  return metadata;
}

export async function deleteFile(solutionName: string, fileName: string): Promise<void> {
  const filesDir = await getStoragePath();
  const solution = assertIdentifier(solutionName, "solution name");
  const file = assertIdentifier(fileName, "file name");
  await fs.rm(containedPath(filesDir, solution, file), { recursive: true, force: true });
  await updateSlnFile(solution);
}

export async function migrateFlatFiles(): Promise<void> {
  const filesDir = await getStoragePath();
  await ensureDir(filesDir);
  const entries = await fs.readdir(filesDir, { withFileTypes: true });
  const dirs = entries.filter((entry) => entry.isDirectory() && IDENTIFIER.test(entry.name));
  const legacyDirs: string[] = [];
  for (const dir of dirs) {
    try {
      await fs.access(containedPath(filesDir, dir.name, "Main.cs"));
      legacyDirs.push(dir.name);
    } catch {}
  }

  if (legacyDirs.length) {
    const defaultPath = containedPath(filesDir, "Default");
    await fs.mkdir(defaultPath, { recursive: true });
    for (const name of legacyDirs) {
      await fs.rename(containedPath(filesDir, name), containedPath(defaultPath, name));
    }
    await fs.writeFile(containedPath(defaultPath, "Default.sln"), generateSlnFile("Default", []), "utf-8");
  }

  await listSolutions();
}

export async function migrateProjects(
  targetPath: string,
  mode: "new-only" | "all"
): Promise<{ moved: number }> {
  const oldPath = path.resolve(await getStoragePath());
  const newPath = path.resolve(targetPath);
  if (oldPath === newPath) return { moved: 0 };
  await ensureDir(newPath);
  if (mode === "new-only") return { moved: 0 };

  let moved = 0;
  try {
    const entries = await fs.readdir(oldPath, { withFileTypes: true });
    for (const entry of entries.filter((item) => item.isDirectory() && IDENTIFIER.test(item.name))) {
      const source = containedPath(oldPath, entry.name);
      const destination = containedPath(newPath, entry.name);
      try {
        await fs.access(destination);
        continue;
      } catch {}
      await fs.rename(source, destination);
      moved++;
    }
  } catch (error: any) {
    if (error.code !== "ENOENT") throw error;
  }
  return { moved };
}

function csharpProjectFile(): string {
  return `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>
`;
}

function generateGuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = (Math.random() * 16) | 0;
    return (character === "x" ? random : (random & 3) | 8).toString(16);
  });
}

function generateSlnFile(solutionName: string, projectNames: string[]): string {
  const lines = [
    "",
    "Microsoft Visual Studio Solution File, Format Version 12.00",
    "# Visual Studio Version 17",
    "VisualStudioVersion = 17.0.31903.59",
    "MinimumVisualStudioVersion = 10.0.40219.1",
  ];
  const projectGuids: string[] = [];
  for (const projectName of projectNames) {
    const guid = generateGuid();
    projectGuids.push(guid);
    lines.push(`Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "${projectName}", "${projectName}\\${projectName}.csproj", "{${guid}}"`);
    lines.push("EndProject");
  }
  lines.push("Global", "\tGlobalSection(SolutionConfigurationPlatforms) = preSolution", "\t\tDebug|Any CPU = Debug|Any CPU", "\t\tRelease|Any CPU = Release|Any CPU", "\tEndGlobalSection", "\tGlobalSection(ProjectConfigurationPlatforms) = postSolution");
  for (const guid of projectGuids) {
    lines.push(`\t\t{${guid}}.Debug|Any CPU.ActiveCfg = Debug|Any CPU`);
    lines.push(`\t\t{${guid}}.Debug|Any CPU.Build.0 = Debug|Any CPU`);
    lines.push(`\t\t{${guid}}.Release|Any CPU.ActiveCfg = Release|Any CPU`);
    lines.push(`\t\t{${guid}}.Release|Any CPU.Build.0 = Release|Any CPU`);
  }
  lines.push("\tEndGlobalSection", "EndGlobal", "");
  return lines.join("\r\n");
}

async function updateSlnFile(solutionName: string): Promise<void> {
  const filesDir = await getStoragePath();
  const solution = assertIdentifier(solutionName, "solution name");
  const solutionPath = containedPath(filesDir, solution);
  try {
    const files = await listFilesInSolution(solution);
    const csharpProjects = files.filter((file) => file.languageId === "csharp").map((file) => file.name);
    await fs.writeFile(
      containedPath(solutionPath, `${solution}.sln`),
      generateSlnFile(solution, csharpProjects),
      "utf-8"
    );
  } catch (error: any) {
    if (error.code !== "ENOENT") throw error;
  }
}
