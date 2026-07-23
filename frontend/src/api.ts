const API_BASE = "/api";

export type LanguageId = "csharp" | "python" | "java";
export type ExecutionMode = "stdin" | "tests";

export interface RuntimeOption {
  id: string;
  label: string;
  available: boolean;
  isDefault?: boolean;
}

export interface LanguageCapability {
  id: LanguageId;
  label: string;
  monacoLanguage: string;
  extension: string;
  available: boolean;
  runtimes: RuntimeOption[];
}

interface LegacyRuntimeCapability {
  languageId: LanguageId;
  runtimeId: string;
  displayName: string;
  sourceFileName?: string;
}

export interface RuntimeCapabilities {
  languages: LanguageCapability[];
  limits?: Record<string, unknown>;
}

export const LEGACY_CAPABILITIES: RuntimeCapabilities = {
  languages: [{
    id: "csharp",
    label: "C#",
    monacoLanguage: "csharp",
    extension: ".cs",
    available: true,
    runtimes: [{ id: "dotnet-8", label: ".NET 8", available: true, isDefault: true }],
  }],
};

async function errorMessage(res: Response): Promise<string> {
  const body = await res.text().catch(() => "");
  if (!body) return `Request failed: ${res.status}`;
  try {
    const parsed = JSON.parse(body);
    return parsed.message || parsed.error || parsed.detail || body;
  } catch {
    return body;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(await errorMessage(res));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface TestCase {
  input: string;
  expectedOutput: string;
}

export interface FileEntry {
  name: string;
  code: string;
  testCases: TestCase[];
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
  languageId: LanguageId;
  runtimeId: string;
  sourceFileName: string;
  executionMode: ExecutionMode;
  scratchStdin: string;
}

export interface FileListItem {
  name: string;
  updatedAt: string;
  schemaVersion: number;
  languageId: LanguageId;
  runtimeId: string;
  sourceFileName: string;
  executionMode: ExecutionMode;
  scratchStdin: string;
}

export interface SolutionFolder {
  name: string;
  files: FileListItem[];
  updatedAt: string;
}

export interface LintError {
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning";
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  compileErrors: string;
  compileErrorsList: LintError[];
  testResults?: {
    passed: number;
    total: number;
    details: { input: string; expected: string; actual: string; passed: boolean }[];
  };
  timedOut: boolean;
}

function normalizeMetadata<T extends { name?: string }>(entry: T): T & Pick<FileEntry, "schemaVersion" | "languageId" | "runtimeId" | "sourceFileName" | "executionMode" | "scratchStdin"> {
  return {
    ...entry,
    schemaVersion: Number((entry as any).schemaVersion) || 1,
    languageId: (["csharp", "python", "java"].includes((entry as any).languageId) ? (entry as any).languageId : "csharp") as LanguageId,
    runtimeId: (entry as any).runtimeId || "dotnet-8",
    sourceFileName: (entry as any).sourceFileName || "Main.cs",
    executionMode: (entry as any).executionMode === "tests" ? "tests" : "stdin",
    scratchStdin: (entry as any).scratchStdin || "",
  };
}

export async function getRuntimes(): Promise<RuntimeCapabilities> {
  const payload = await request<RuntimeCapabilities | LanguageCapability[] | LegacyRuntimeCapability[]>(`${API_BASE}/runtimes`);
  const capabilities = Array.isArray(payload)
    ? "languageId" in (payload[0] || {})
      ? {
          languages: (["csharp", "python", "java"] as LanguageId[]).flatMap((id) => {
            const runtimes = (payload as LegacyRuntimeCapability[]).filter((item) => item.languageId === id);
            if (!runtimes.length) return [];
            const defaults = {
              csharp: { label: "C#", monacoLanguage: "csharp", extension: ".cs" },
              python: { label: "Python", monacoLanguage: "python", extension: ".py" },
              java: { label: "Java", monacoLanguage: "java", extension: ".java" },
            }[id];
            return [{
              id,
              ...defaults,
              available: true,
              runtimes: runtimes.map((runtime, index) => ({
                id: runtime.runtimeId,
                label: runtime.displayName,
                available: true,
                isDefault: index === 0,
              })),
            }];
          }),
        }
      : { languages: payload as LanguageCapability[] }
    : payload;
  return capabilities?.languages?.length ? capabilities : LEGACY_CAPABILITIES;
}

// --- Solution/Folder API ---

export async function listSolutions(): Promise<SolutionFolder[]> {
  const solutions = await request<SolutionFolder[]>(`${API_BASE}/solutions`);
  return solutions.map((solution) => ({
    ...solution,
    files: (solution.files || []).map(normalizeMetadata),
  }));
}

export async function createSolution(name: string): Promise<void> {
  await request<void>(`${API_BASE}/solutions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export async function deleteSolution(name: string): Promise<void> {
  await request<void>(`${API_BASE}/solutions/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

export async function renameSolution(name: string, newName: string): Promise<void> {
  await request<void>(`${API_BASE}/solutions/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newName }),
  });
}

// --- File API (within solutions) ---

export async function listFilesInSolution(solution: string): Promise<FileListItem[]> {
  const files = await request<FileListItem[]>(
    `${API_BASE}/solutions/${encodeURIComponent(solution)}/files`
  );
  return files.map(normalizeMetadata);
}

export async function getFile(solution: string, file: string): Promise<FileEntry> {
  const entry = await request<FileEntry>(
    `${API_BASE}/solutions/${encodeURIComponent(solution)}/files/${encodeURIComponent(file)}`
  );
  return { ...normalizeMetadata({ ...entry, name: entry.name || file }), testCases: entry.testCases || [] } as FileEntry;
}

export async function saveFile(
  solution: string,
  file: string,
  document: Pick<FileEntry, "schemaVersion" | "languageId" | "runtimeId" | "sourceFileName" | "executionMode" | "scratchStdin" | "code" | "testCases">
): Promise<void> {
  await request<void>(
    `${API_BASE}/solutions/${encodeURIComponent(solution)}/files/${encodeURIComponent(file)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(document),
    }
  );
}

export async function deleteFile(solution: string, file: string): Promise<void> {
  await request<void>(
    `${API_BASE}/solutions/${encodeURIComponent(solution)}/files/${encodeURIComponent(file)}`,
    {
      method: "DELETE",
    }
  );
}

// --- Execution API ---

export async function executeCode(
  payload: {
    languageId: LanguageId;
    runtimeId: string;
    executionMode: ExecutionMode;
    code: string;
    testCases?: TestCase[];
    stdin?: string;
  }
): Promise<ExecutionResult> {
  return request<ExecutionResult>(`${API_BASE}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function lintCode(
  languageId: LanguageId,
  runtimeId: string,
  code: string
): Promise<{ errors: LintError[]; stdout: string; stderr: string }> {
  return request<{ errors: LintError[]; stdout: string; stderr: string }>(
    `${API_BASE}/lint`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ languageId, runtimeId, code }),
    }
  );
}

// --- Settings API ---

export interface Settings {
  storagePath: string;
}

export async function getSettings(): Promise<Settings> {
  return request<Settings>(`${API_BASE}/settings`);
}

export async function updateSettings(storagePath: string): Promise<Settings> {
  return request<Settings>(`${API_BASE}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storagePath }),
  });
}

export async function migrateProjects(
  storagePath: string,
  mode: "new-only" | "all"
): Promise<{ success: boolean; moved: number }> {
  return request<{ success: boolean; moved: number }>(
    `${API_BASE}/settings/migrate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storagePath, mode }),
    }
  );
}
