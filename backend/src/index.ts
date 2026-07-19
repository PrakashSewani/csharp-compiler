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

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3001;

// Run migration on startup
migrateFlatFiles().catch((e) => console.error("Migration failed:", e));

// --- Solution/Folder Endpoints ---

app.get("/api/solutions", async (_req, res) => {
  try {
    const solutions = await listSolutions();
    res.json(solutions);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/solutions", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    await createSolution(name);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/solutions/:name", async (req, res) => {
  try {
    await deleteSolution(req.params.name);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/solutions/:name", async (req, res) => {
  try {
    const { newName } = req.body;
    if (!newName) return res.status(400).json({ error: "New name is required" });
    await renameSolution(req.params.name, newName);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- File Endpoints (within solutions) ---

app.get("/api/solutions/:solution/files", async (req, res) => {
  try {
    const files = await listFilesInSolution(req.params.solution);
    res.json(files);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/solutions/:solution/files/:file", async (req, res) => {
  try {
    const file = await getFile(req.params.solution, req.params.file);
    if (!file) return res.status(404).json({ error: "File not found" });
    res.json(file);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/solutions/:solution/files/:file", async (req, res) => {
  try {
    const { code, testCases } = req.body;
    await saveFile(req.params.solution, req.params.file, code, testCases);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/solutions/:solution/files/:file", async (req, res) => {
  try {
    await deleteFile(req.params.solution, req.params.file);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- Settings Endpoints ---

app.get("/api/settings", async (_req, res) => {
  try {
    const config = await getConfig();
    res.json(config);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/settings", async (req, res) => {
  try {
    const { storagePath } = req.body;
    if (!storagePath) return res.status(400).json({ error: "storagePath is required" });
    const config = await updateConfig({ storagePath });
    res.json(config);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
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
    res.status(500).json({ error: e.message });
  }
});

// --- Execution ---

app.post("/api/execute", async (req, res) => {
  try {
    const { code, testCases, stdin } = req.body;
    const result = await executeCode(code, testCases, stdin);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/lint", async (req, res) => {
  try {
    const { code } = req.body;
    const result = await lintCode(code);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
