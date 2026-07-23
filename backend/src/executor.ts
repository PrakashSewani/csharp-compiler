import Docker from "dockerode";
import fs from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import {
  Diagnostic,
  ExecutionMode,
  getRuntime,
  LanguageId,
  RuntimeAdapter,
} from "./runtimes.js";

const docker = new Docker({ socketPath: process.env.DOCKER_HOST || "/var/run/docker.sock" });
const WORKSPACE = process.env.EXEC_WORKSPACE || "/exec-workspace";
const WORKSPACE_VOLUME = process.env.EXEC_WORKSPACE_VOLUME || "algorithm-desk-exec-workspace";
const OUTPUT_LIMIT = Number(process.env.EXEC_OUTPUT_LIMIT_BYTES || 64 * 1024);

export interface TestCase {
  input: string;
  expectedOutput: string;
}

interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  compileErrors: string;
  compileErrorsList: Diagnostic[];
  testResults?: {
    passed: number;
    total: number;
    details: { input: string; expected: string; actual: string; passed: boolean }[];
  };
  timedOut: boolean;
}

interface SandboxResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  outputLimitExceeded: boolean;
}

async function prepareWorkspace(prefix: string): Promise<{ id: string; dir: string }> {
  const id = `${prefix}-${uuid()}`;
  const dir = path.join(WORKSPACE, id);
  await fs.mkdir(dir, { recursive: true });
  return { id, dir };
}

async function writeRuntimeFiles(dir: string, runtime: RuntimeAdapter, code: string): Promise<void> {
  const files = runtime.prepareFiles(code);
  await Promise.all(Object.entries(files).map(([name, content]) =>
    fs.writeFile(path.join(dir, name), content, "utf-8")
  ));
}

async function runSandbox(
  workspaceId: string,
  image: string,
  command: string,
  memoryMb: number,
  timeoutSec: number
): Promise<SandboxResult> {
  const container = await docker.createContainer({
    Image: image,
    Cmd: ["sh", "-c", command],
    HostConfig: {
      Binds: [`${WORKSPACE_VOLUME}:/work:rw`],
      Memory: memoryMb * 1024 * 1024,
      CpuQuota: 100000,
      NetworkMode: "none",
      PidsLimit: 64,
      CapDrop: ["ALL"],
      SecurityOpt: ["no-new-privileges:true"],
    },
    WorkingDir: `/work/${workspaceId}`,
    StopTimeout: 2,
  });

  let timedOut = false;
  let outputLimitExceeded = false;
  let killRequested = false;
  const kill = async () => {
    if (killRequested) return;
    killRequested = true;
    try { await container.kill(); } catch {}
  };

  try {
    await container.start();
    const stream = await container.logs({ follow: true, stdout: true, stderr: true });
    const outputPromise = collectDockerLogs(stream, OUTPUT_LIMIT, () => {
      outputLimitExceeded = true;
      void kill();
    });
    const timeout = setTimeout(() => {
      timedOut = true;
      void kill();
    }, timeoutSec * 1000);

    const [output] = await Promise.all([outputPromise, container.wait()]);
    clearTimeout(timeout);
    const inspect = await container.inspect();
    const suffix = outputLimitExceeded ? `\nOutput exceeded ${OUTPUT_LIMIT} byte limit.` : "";
    return {
      stdout: output.stdout,
      stderr: output.stderr + suffix,
      exitCode: inspect.State.ExitCode ?? 1,
      timedOut,
      outputLimitExceeded,
    };
  } finally {
    try { await container.remove({ force: true }); } catch {}
  }
}

export async function executeCode(
  languageId: LanguageId,
  runtimeId: string,
  executionMode: ExecutionMode,
  code: string,
  testCases: TestCase[] = [],
  stdin = ""
): Promise<ExecutionResult> {
  const runtime = getRuntime(languageId, runtimeId);
  const workspace = await prepareWorkspace("exec");

  try {
    await writeRuntimeFiles(workspace.dir, runtime, code);
    const validation = await runSandbox(workspace.id, runtime.image, runtime.validateCommand, 512, 30);
    const validationOutput = [validation.stdout, validation.stderr].filter(Boolean).join("\n").trim();
    if (validation.exitCode !== 0 || validation.timedOut || validation.outputLimitExceeded) {
      return {
        stdout: "",
        stderr: validationOutput,
        exitCode: validation.exitCode,
        compileErrors: validationOutput,
        compileErrorsList: runtime.parseDiagnostics(validationOutput),
        timedOut: validation.timedOut,
      };
    }

    if (executionMode === "tests") {
      const details: { input: string; expected: string; actual: string; passed: boolean }[] = [];
      let timedOut = false;
      let exitCode = 0;
      let stderr = "";

      for (let i = 0; i < testCases.length; i++) {
        const test = testCases[i];
        const inputFile = `test-input-${i}.txt`;
        await fs.writeFile(path.join(workspace.dir, inputFile), test.input, "utf-8");
        const run = await runSandbox(
          workspace.id,
          runtime.image,
          `${runtime.runCommand} < ${inputFile}`,
          256,
          15
        );
        const actual = run.stdout.trim();
        const passed = !run.timedOut && run.exitCode === 0 && actual === test.expectedOutput.trim();
        details.push({ input: test.input, expected: test.expectedOutput, actual, passed });
        timedOut ||= run.timedOut;
        if (run.exitCode !== 0) exitCode = run.exitCode;
        if (run.stderr) stderr += `${stderr ? "\n" : ""}Test ${i + 1}: ${run.stderr.trim()}`;
      }

      return {
        stdout: details.map((detail) => detail.actual).join("\n"),
        stderr,
        exitCode,
        compileErrors: "",
        compileErrorsList: [],
        testResults: {
          passed: details.filter((detail) => detail.passed).length,
          total: testCases.length,
          details,
        },
        timedOut,
      };
    }

    await fs.writeFile(path.join(workspace.dir, "stdin.txt"), stdin, "utf-8");
    const run = await runSandbox(workspace.id, runtime.image, `${runtime.runCommand} < stdin.txt`, 256, 30);
    return {
      stdout: run.stdout,
      stderr: run.stderr,
      exitCode: run.exitCode,
      compileErrors: "",
      compileErrorsList: [],
      timedOut: run.timedOut,
    };
  } finally {
    await fs.rm(workspace.dir, { recursive: true, force: true });
  }
}

export async function lintCode(
  languageId: LanguageId,
  runtimeId: string,
  code: string
): Promise<{ errors: Diagnostic[]; stdout: string; stderr: string }> {
  const runtime = getRuntime(languageId, runtimeId);
  const workspace = await prepareWorkspace("lint");
  try {
    await writeRuntimeFiles(workspace.dir, runtime, code);
    const result = await runSandbox(workspace.id, runtime.image, runtime.validateCommand, 256, 15);
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    return { errors: runtime.parseDiagnostics(output), stdout: "", stderr: output };
  } finally {
    await fs.rm(workspace.dir, { recursive: true, force: true });
  }
}

function collectDockerLogs(
  stream: NodeJS.ReadableStream,
  limit: number,
  onLimit: () => void
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let pending = Buffer.alloc(0);
    let bytes = 0;
    stream.on("data", (chunk: Buffer) => {
      if (bytes >= limit) return;
      pending = Buffer.concat([pending, chunk]);
      while (pending.length >= 8) {
        const streamType = pending[0];
        const size = pending.readUInt32BE(4);
        if ((streamType !== 1 && streamType !== 2) || pending.length < 8 + size) break;
        const payload = pending.subarray(8, 8 + size);
        const remaining = limit - bytes;
        const accepted = payload.subarray(0, remaining);
        (streamType === 2 ? stderr : stdout).push(accepted);
        bytes += accepted.length;
        pending = pending.subarray(8 + size);
        if (accepted.length < payload.length || bytes >= limit) {
          onLimit();
          break;
        }
      }
    });
    stream.on("end", () => {
      if (!stdout.length && !stderr.length && pending.length) {
        stdout.push(pending.subarray(0, Math.max(0, limit - bytes)));
      }
      resolve({ stdout: Buffer.concat(stdout).toString("utf-8"), stderr: Buffer.concat(stderr).toString("utf-8") });
    });
    stream.on("error", reject);
  });
}
