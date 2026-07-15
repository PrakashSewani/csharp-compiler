import express from "express";
import cors from "cors";
import { listFiles, getFile, saveFile, deleteFile } from "./fileService.js";
import { executeCode, lintCode } from "./executor.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3001;

// File management
app.get("/api/files", async (_req, res) => {
  try {
    const files = await listFiles();
    res.json(files);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/files/:name", async (req, res) => {
  try {
    const file = await getFile(req.params.name);
    if (!file) return res.status(404).json({ error: "File not found" });
    res.json(file);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/files/:name", async (req, res) => {
  try {
    const { code, testCases } = req.body;
    await saveFile(req.params.name, code, testCases);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/files/:name", async (req, res) => {
  try {
    await deleteFile(req.params.name);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Execution
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
