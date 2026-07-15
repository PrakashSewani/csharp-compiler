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
  testResults?: {
    passed: number;
    total: number;
    details: { input: string; expected: string; actual: string; passed: boolean }[];
  };
  timedOut: boolean;
}

export async function listFiles(): Promise<FileListItem[]> {
  const res = await fetch(`${API_BASE}/files`);
  return res.json();
}

export async function getFile(name: string): Promise<FileEntry> {
  const res = await fetch(`${API_BASE}/files/${encodeURIComponent(name)}`);
  return res.json();
}

export async function saveFile(
  name: string,
  code: string,
  testCases: TestCase[] = []
): Promise<void> {
  await fetch(`${API_BASE}/files/${encodeURIComponent(name)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, testCases }),
  });
}

export async function deleteFile(name: string): Promise<void> {
  await fetch(`${API_BASE}/files/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

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
