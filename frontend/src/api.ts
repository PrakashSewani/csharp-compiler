const API_BASE = "/api";

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
  const res = await fetch(`${API_BASE}/solutions`);
  return res.json();
}

export async function createSolution(name: string): Promise<void> {
  await fetch(`${API_BASE}/solutions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export async function deleteSolution(name: string): Promise<void> {
  await fetch(`${API_BASE}/solutions/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

export async function renameSolution(name: string, newName: string): Promise<void> {
  await fetch(`${API_BASE}/solutions/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newName }),
  });
}

// --- File API (within solutions) ---

export async function listFilesInSolution(solution: string): Promise<FileListItem[]> {
  const res = await fetch(`${API_BASE}/solutions/${encodeURIComponent(solution)}/files`);
  return res.json();
}

export async function getFile(solution: string, file: string): Promise<FileEntry> {
  const res = await fetch(
    `${API_BASE}/solutions/${encodeURIComponent(solution)}/files/${encodeURIComponent(file)}`
  );
  return res.json();
}

export async function saveFile(
  solution: string,
  file: string,
  code: string,
  testCases: TestCase[] = []
): Promise<void> {
  await fetch(
    `${API_BASE}/solutions/${encodeURIComponent(solution)}/files/${encodeURIComponent(file)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, testCases }),
    }
  );
}

export async function deleteFile(solution: string, file: string): Promise<void> {
  await fetch(
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
  const res = await fetch(`${API_BASE}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, testCases, stdin }),
  });
  return res.json();
}

export async function lintCode(
  code: string
): Promise<{ errors: LintError[]; stdout: string; stderr: string }> {
  const res = await fetch(`${API_BASE}/lint`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  return res.json();
}
