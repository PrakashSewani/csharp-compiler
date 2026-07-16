import Docker from "dockerode";
import fs from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";

const docker = new Docker({ socketPath: process.env.DOCKER_HOST || "/var/run/docker.sock" });
const SANDBOX_IMAGE = process.env.SANDBOX_IMAGE || "csharp-sandbox";
const FILES_DIR = process.env.FILES_DIR || "/app/files";
// Shared workspace volume mounted in both backend and sandbox containers
const WORKSPACE = process.env.EXEC_WORKSPACE || "/exec-workspace";

interface TestCase {
  input: string;
  expectedOutput: string;
}

interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  compileErrors: string;
  compileErrorsList: { line: number; column: number; message: string; severity: "error" | "warning" }[];
  testResults?: {
    passed: number;
    total: number;
    details: { input: string; expected: string; actual: string; passed: boolean }[];
  };
  timedOut: boolean;
}

function wrapCodeWithMain(code: string, testCases?: TestCase[], stdin?: string): string {
  let wrapped = code;

  if (testCases && testCases.length > 0) {
    const testHarness = `
// === TEST HARNESS (auto-generated) ===
class __TestHarness
{
    static void Main(string[] args)
    {
        int passed = 0;
        int total = ${testCases.length};
        string[] results = new string[total];

${testCases
  .map(
    (tc, i) => `
        // Test ${i + 1}
        try
        {
            var __input${i} = ${JSON.stringify(tc.input)};
            var __expected${i} = ${JSON.stringify(tc.expectedOutput)};
            var __actual${i} = __TestCase.Run(__input${i});
            bool __passed${i} = __actual${i}.Trim() == __expected${i}.Trim();
            if (__passed${i}) passed++;
            results[${i}] = $"Test ${i + 1}: {(__passed${i} ? "PASS" : "FAIL")} | Input: {__input${i}} | Expected: {__expected${i}} | Got: {__actual${i}}";
        }
        catch (Exception ex)
        {
            results[${i}] = $"Test ${i + 1}: ERROR | ${tc.input} | Exception: {ex.Message}";
        }
`
  )
  .join("\n")}

        Console.WriteLine($"=== Results: {{passed}}/{{total}} tests passed ===");
        foreach (var r in results) Console.WriteLine(r);
    }
}

class __TestCase
{
    public static string Run(string input)
    {
        var __sw = new StringWriter();
        Console.SetOut(__sw);
        var __result = Solution.Solve(input);
        Console.SetOut(new StreamWriter(Console.OpenStandardOutput()) { AutoFlush = true });
        return __result?.ToString() ?? "";
    }
}
`;
    wrapped = wrapped + "\n" + testHarness;
  } else if (stdin) {
    wrapped = `
using System;
using System.IO;

${wrapped.replace(/^using\s+System.*;?\n?/gm, "").replace(/^using\s+System\.IO.*;?\n?/gm, "")}

class __Runner
{
    static void Main(string[] args)
    {
        Console.SetIn(new StringReader(${JSON.stringify(stdin)}));
        Solution.Solve(null);
    }
}
`;
  }

  return wrapped;
}

function wrapCodeWithMainNoTestCases(code: string): string {
  if (
    code.includes("static void Main") ||
    code.includes("static async Task Main") ||
    code.includes("static int Main")
  ) {
    return code;
  }

  return `${code}

class __Runner
{
    static void Main(string[] args)
    {
        try { Solution.Solve(null); }
        catch (Exception ex) { Console.WriteLine(ex.Message); }
    }
}`;
}

const CSPROJ = `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>
`;

async function prepareWorkspace(prefix: string): Promise<string> {
  const id = `${prefix}-${uuid()}`;
  const dir = path.join(WORKSPACE, id);
  await fs.mkdir(dir, { recursive: true });
  return id;
}

async function runSandbox(
  workspaceId: string,
  cmd: string,
  memoryMb: number,
  timeoutSec: number
): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }> {
  const container = await docker.createContainer({
    Image: SANDBOX_IMAGE,
    Cmd: ["sh", "-c", cmd],
    HostConfig: {
      Binds: [`csharp-exec-workspace:/work:rw`],
      Memory: memoryMb * 1024 * 1024,
      CpuQuota: 100000,
      NetworkMode: "none",
    },
    WorkingDir: `/work/${workspaceId}`,
    StopTimeout: 5,
  });

  await container.start();

  let timedOut = false;
  const timeout = setTimeout(async () => {
    timedOut = true;
    try { await container.kill(); } catch {}
  }, timeoutSec * 1000);

  const stream = await container.logs({ follow: true, stdout: true, stderr: true });
  const output = await streamToString(stream);
  clearTimeout(timeout);

  const inspect = await container.inspect();
  const exitCode = inspect.State.ExitCode ?? 1;

  try { await container.remove(); } catch {}

  return { stdout: output, stderr: "", exitCode, timedOut };
}

export async function executeCode(
  code: string,
  testCases?: TestCase[],
  stdin?: string
): Promise<ExecutionResult> {
  const wsId = await prepareWorkspace("exec");
  const wsDir = path.join(WORKSPACE, wsId);

  try {
    const wrappedCode =
      testCases && testCases.length > 0
        ? wrapCodeWithMain(code, testCases)
        : wrapCodeWithMainNoTestCases(code);

    await fs.writeFile(path.join(wsDir, "Program.csproj"), CSPROJ);
    await fs.writeFile(path.join(wsDir, "Program.cs"), wrappedCode);

    const result = await runSandbox(
      wsId,
      "dotnet build --nologo -v q 2>&1 && echo '___RUN_OUTPUT___' && dotnet run --no-build 2>&1",
      512,
      30
    );

    const { stdout, stderr, exitCode, timedOut } = result;
    const separator = stdout.indexOf("___RUN_OUTPUT___");
    const buildOutput = separator >= 0 ? stdout.slice(0, separator).trim() : "";
    const runOutput = separator >= 0 ? stdout.slice(separator + "___RUN_OUTPUT___".length).trim() : stdout;

    const hasBuildError = buildOutput.includes("error CS") || buildOutput.includes("Build FAILED");

    return {
      stdout: hasBuildError ? "" : runOutput,
      stderr: hasBuildError ? buildOutput : "",
      exitCode,
      compileErrors: hasBuildError ? buildOutput : "",
      compileErrorsList: hasBuildError ? parseBuildErrors(buildOutput) : [],
      timedOut,
      testResults:
        testCases && testCases.length > 0
          ? parseTestResults(hasBuildError ? "" : runOutput, testCases)
          : undefined,
    };
  } finally {
    await fs.rm(wsDir, { recursive: true, force: true });
  }
}

export async function lintCode(code: string): Promise<{
  errors: { line: number; column: number; message: string; severity: "error" | "warning" }[];
  stdout: string;
  stderr: string;
}> {
  const wsId = await prepareWorkspace("lint");
  const wsDir = path.join(WORKSPACE, wsId);

  try {
    await fs.writeFile(path.join(wsDir, "Program.csproj"), CSPROJ);
    await fs.writeFile(path.join(wsDir, "Program.cs"), wrapCodeWithMainNoTestCases(code));

    const result = await runSandbox(
      wsId,
      "dotnet build --nologo -v q 2>&1",
      256,
      15
    );

    return {
      errors: parseBuildErrors(result.stdout),
      stdout: "",
      stderr: result.stdout,
    };
  } finally {
    await fs.rm(wsDir, { recursive: true, force: true });
  }
}

function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(demuxDockerLogs(Buffer.concat(chunks))));
    stream.on("error", reject);
  });
}

// Docker multiplexed log format: each frame has an 8-byte header
// [stream_type(1), padding(3), size(4 big-endian)] followed by payload
function demuxDockerLogs(buf: Buffer): string {
  const parts: string[] = [];
  let offset = 0;
  while (offset + 8 <= buf.length) {
    const streamType = buf[offset]; // 1=stdout, 2=stderr
    const size = buf.readUInt32BE(offset + 4);
    offset += 8;
    if (offset + size > buf.length) break;
    parts.push(buf.slice(offset, offset + size).toString("utf-8"));
    offset += size;
  }
  // Fallback: if no frames were parsed, treat as raw text
  return parts.length > 0 ? parts.join("") : buf.toString("utf-8");
}

function parseBuildErrors(
  output: string
): { line: number; column: number; message: string; severity: "error" | "warning" }[] {
  const errors: { line: number; column: number; message: string; severity: "error" | "warning" }[] = [];
  const regex = /Program\.cs\((\d+),(\d+)\):\s+(error|warning)\s+(\w+):\s+(.+)/g;
  let match;

  while ((match = regex.exec(output)) !== null) {
    errors.push({
      line: parseInt(match[1]),
      column: parseInt(match[2]),
      message: `${match[4]}: ${match[5]}`,
      severity: match[3] as "error" | "warning",
    });
  }

  return errors;
}

function parseTestResults(
  output: string,
  testCases: TestCase[]
): {
  passed: number;
  total: number;
  details: { input: string; expected: string; actual: string; passed: boolean }[];
} {
  const lines = output.split("\n").filter((l) => l.startsWith("Test "));
  const details = lines.map((line, i) => {
    const passed = line.includes("PASS");
    const inputMatch = line.match(/Input: (.+?) \|/);
    const expectedMatch = line.match(/Expected: (.+?) \|/);
    const actualMatch = line.match(/Got: (.+)/);

    return {
      input: inputMatch?.[1] || testCases[i]?.input || "",
      expected: expectedMatch?.[1] || testCases[i]?.expectedOutput || "",
      actual: actualMatch?.[1] || "N/A",
      passed,
    };
  });

  const passed = details.filter((d) => d.passed).length;
  return { passed, total: testCases.length, details };
}
