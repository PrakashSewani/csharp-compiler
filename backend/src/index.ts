import express from "express";
import cors from "cors";
import {
  listSolutions,
  createSolution,
  deleteSolution,
  renameSolution,
  listFilesInSolution,
  getFile,
  saveFile,
  deleteFile,
  migrateFlatFiles,
  migrateProjects,
} from "./fileService.js";
import { executeCode, lintCode } from "./executor.js";
import { getConfig, updateConfig } from "./configService.js";
import {
  getRuntime,
  isExecutionMode,
  isLanguageId,
  listRuntimeCapabilities,
} from "./runtimes.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3001;

function statusForError(error: any): number {
  return /Invalid|required|Unsupported|must be/.test(error?.message || "") ? 400 : 500;
}

function parseTestCases(value: unknown): { input: string; expectedOutput: string }[] {
  if (!Array.isArray(value)) throw new Error("Invalid testCases");
  return value.map((testCase) => {
    if (!testCase || typeof testCase !== "object") throw new Error("Invalid testCases");
    const item = testCase as Record<string, unknown>;
    if (typeof item.input !== "string" || typeof item.expectedOutput !== "string") {
      throw new Error("Invalid testCases");
    }
    return { input: item.input, expectedOutput: item.expectedOutput };
  });
}

// Run migration on startup
migrateFlatFiles().catch((e) => console.error("Migration failed:", e));

// --- Solution/Folder Endpoints ---

app.get("/api/solutions", async (_req, res) => {
  try {
    const solutions = await listSolutions();
    res.json(solutions);
  } catch (e: any) {
    res.status(statusForError(e)).json({ error: e.message });
  }
});

app.post("/api/solutions", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    await createSolution(name);
    res.json({ success: true });
  } catch (e: any) {
    res.status(statusForError(e)).json({ error: e.message });
  }
});

app.delete("/api/solutions/:name", async (req, res) => {
  try {
    await deleteSolution(req.params.name);
    res.json({ success: true });
  } catch (e: any) {
    res.status(statusForError(e)).json({ error: e.message });
  }
});

app.put("/api/solutions/:name", async (req, res) => {
  try {
    const { newName } = req.body;
    if (!newName) return res.status(400).json({ error: "New name is required" });
    await renameSolution(req.params.name, newName);
    res.json({ success: true });
  } catch (e: any) {
    res.status(statusForError(e)).json({ error: e.message });
  }
});

// --- File Endpoints (within solutions) ---

app.get("/api/solutions/:solution/files", async (req, res) => {
  try {
    const files = await listFilesInSolution(req.params.solution);
    res.json(files);
  } catch (e: any) {
    res.status(statusForError(e)).json({ error: e.message });
  }
});

app.get("/api/solutions/:solution/files/:file", async (req, res) => {
  try {
    const file = await getFile(req.params.solution, req.params.file);
    if (!file) return res.status(404).json({ error: "File not found" });
    res.json(file);
  } catch (e: any) {
    res.status(statusForError(e)).json({ error: e.message });
  }
});

app.post("/api/solutions/:solution/files/:file", async (req, res) => {
  try {
    const {
      code,
      testCases = [],
      languageId = "csharp",
      runtimeId = "dotnet-8",
      sourceFileName = "Main.cs",
      executionMode = "stdin",
      scratchStdin = "",
    } = req.body;
    if (typeof code !== "string") return res.status(400).json({ error: "code is required" });
    if (!isLanguageId(languageId)) return res.status(400).json({ error: "Invalid languageId" });
    if (!isExecutionMode(executionMode)) return res.status(400).json({ error: "Invalid executionMode" });
    if (typeof runtimeId !== "string") return res.status(400).json({ error: "Invalid runtimeId" });
    if (typeof sourceFileName !== "string") return res.status(400).json({ error: "Invalid sourceFileName" });
    if (typeof scratchStdin !== "string") return res.status(400).json({ error: "Invalid scratchStdin" });
    const metadata = await saveFile(req.params.solution, req.params.file, {
      code,
      testCases: parseTestCases(testCases),
      languageId,
      runtimeId,
      sourceFileName,
      executionMode,
      scratchStdin,
    });
    res.json({ success: true, metadata });
  } catch (e: any) {
    res.status(statusForError(e)).json({ error: e.message });
  }
});

app.delete("/api/solutions/:solution/files/:file", async (req, res) => {
  try {
    await deleteFile(req.params.solution, req.params.file);
    res.json({ success: true });
  } catch (e: any) {
    res.status(statusForError(e)).json({ error: e.message });
  }
});

// --- Settings Endpoints ---

app.get("/api/settings", async (_req, res) => {
  try {
    const config = await getConfig();
    res.json(config);
  } catch (e: any) {
    res.status(statusForError(e)).json({ error: e.message });
  }
});

app.put("/api/settings", async (req, res) => {
  try {
    const { storagePath } = req.body;
    if (!storagePath) return res.status(400).json({ error: "storagePath is required" });
    const config = await updateConfig({ storagePath });
    res.json(config);
  } catch (e: any) {
    res.status(statusForError(e)).json({ error: e.message });
  }
});

app.post("/api/settings/migrate", async (req, res) => {
  try {
    const { storagePath, mode } = req.body;
    if (!storagePath) return res.status(400).json({ error: "storagePath is required" });
    if (!["new-only", "all"].includes(mode)) {
      return res.status(400).json({ error: "mode must be 'new-only' or 'all'" });
    }

    const result = await migrateProjects(storagePath, mode);
    await updateConfig({ storagePath });
    res.json({ success: true, moved: result.moved });
  } catch (e: any) {
    res.status(statusForError(e)).json({ error: e.message });
  }
});

// --- Execution ---

app.get("/api/runtimes", (_req, res) => {
  res.json(listRuntimeCapabilities());
});

app.post("/api/execute", async (req, res) => {
  try {
    const {
      languageId = "csharp",
      runtimeId = "dotnet-8",
      executionMode = Array.isArray(req.body.testCases) && req.body.testCases.length ? "tests" : "stdin",
      code,
      testCases = [],
      stdin = "",
    } = req.body;
    if (typeof code !== "string") return res.status(400).json({ error: "code is required" });
    if (!isLanguageId(languageId)) return res.status(400).json({ error: "Invalid languageId" });
    if (!isExecutionMode(executionMode)) return res.status(400).json({ error: "Invalid executionMode" });
    if (typeof runtimeId !== "string") return res.status(400).json({ error: "Invalid runtimeId" });
    getRuntime(languageId, runtimeId);
    if (typeof stdin !== "string") return res.status(400).json({ error: "Invalid stdin" });
    const result = await executeCode(
      languageId,
      runtimeId,
      executionMode,
      code,
      parseTestCases(testCases),
      stdin
    );
    res.json(result);
  } catch (e: any) {
    res.status(statusForError(e)).json({ error: e.message });
  }
});

app.post("/api/lint", async (req, res) => {
  try {
    const { languageId = "csharp", runtimeId = "dotnet-8", code } = req.body;
    if (typeof code !== "string") return res.status(400).json({ error: "code is required" });
    if (!isLanguageId(languageId)) return res.status(400).json({ error: "Invalid languageId" });
    if (typeof runtimeId !== "string") return res.status(400).json({ error: "Invalid runtimeId" });
    getRuntime(languageId, runtimeId);
    const result = await lintCode(languageId, runtimeId, code);
    res.json(result);
  } catch (e: any) {
    res.status(statusForError(e)).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
