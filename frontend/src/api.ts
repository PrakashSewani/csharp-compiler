const API_BASE = "/api";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `Request failed: ${res.status}`);
  }
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
}

export interface FileListItem {
  name: string;
  updatedAt: string;
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

// --- Solution/Folder API ---

export async function listSolutions(): Promise<SolutionFolder[]> {
  return request<SolutionFolder[]>(`${API_BASE}/solutions`);
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
  return request<FileListItem[]>(
    `${API_BASE}/solutions/${encodeURIComponent(solution)}/files`
  );
}

export async function getFile(solution: string, file: string): Promise<FileEntry> {
  return request<FileEntry>(
    `${API_BASE}/solutions/${encodeURIComponent(solution)}/files/${encodeURIComponent(file)}`
  );
}

export async function saveFile(
  solution: string,
  file: string,
  code: string,
  testCases: TestCase[] = []
): Promise<void> {
  await request<void>(
    `${API_BASE}/solutions/${encodeURIComponent(solution)}/files/${encodeURIComponent(file)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, testCases }),
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
  code: string,
  testCases?: TestCase[],
  stdin?: string
): Promise<ExecutionResult> {
  return request<ExecutionResult>(`${API_BASE}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, testCases, stdin }),
  });
}

export async function lintCode(
  code: string
): Promise<{ errors: LintError[]; stdout: string; stderr: string }> {
  return request<{ errors: LintError[]; stdout: string; stderr: string }>(
    `${API_BASE}/lint`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
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
