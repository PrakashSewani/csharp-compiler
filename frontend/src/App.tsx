import { useState, useCallback, useEffect, useRef } from "react";
import { FileExplorer } from "./components/FileExplorer";
import { Editor } from "./components/Editor";
import { OutputPanel } from "./components/OutputPanel";
import { TestCasePanel } from "./components/TestCasePanel";
import { Header } from "./components/Header";
import * as api from "./api";
import type { TestCase, ExecutionResult, LintError } from "./api";

export default function App() {
  const [files, setFiles] = useState<{ name: string; updatedAt: string }[]>([]);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [code, setCode] = useState<string>("");
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [output, setOutput] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lintErrors, setLintErrors] = useState<LintError[]>([]);
  const [showTestCases, setShowTestCases] = useState(false);
  const [stdin, setStdin] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const refreshFiles = useCallback(async () => {
    const list = await api.listFiles();
    setFiles(list);
  }, []);

  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);

  const openFile = useCallback(async (name: string) => {
    const entry = await api.getFile(name);
    setCurrentFile(name);
    setCode(entry.code);
    setTestCases(entry.testCases || []);
    setOutput(null);
    setLintErrors([]);
  }, []);

  const createNewFile = useCallback(async () => {
    const name = prompt("Enter class name (e.g., TwoSum, MergeSort):");
    if (!name?.trim()) return;
    const cleanName = name.trim().replace(/[^a-zA-Z0-9_]/g, "");
    if (!cleanName) return;

    const template = `using System;
using System.Collections.Generic;
using System.Linq;

public class Solution
{
    public static object Solve(string input)
    {
        // TODO: Implement your solution
        // Parse input from the string parameter
        // Return the result (will be converted to string)
        return "";
    }

    // Add helper methods here
}
`;

    await api.saveFile(cleanName, template, []);
    await refreshFiles();
    await openFile(cleanName);
  }, [refreshFiles, openFile]);

  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);

      // Auto-save with debounce
      if (currentFile) {
        clearTimeout(saveTimer.current);
        setIsSaving(true);
        saveTimer.current = setTimeout(async () => {
          await api.saveFile(currentFile, newCode, testCases);
          setIsSaving(false);
          refreshFiles();
        }, 1500);
      }

      // Lint with debounce
      clearTimeout(lintTimer.current);
      lintTimer.current = setTimeout(async () => {
        if (newCode.trim().length > 20) {
          try {
            const result = await api.lintCode(newCode);
            setLintErrors(result.errors);
          } catch {
            setLintErrors([]);
          }
        } else {
          setLintErrors([]);
        }
      }, 2000);
    },
    [currentFile, testCases, refreshFiles]
  );

  const handleTestCasesChange = useCallback(
    async (newTestCases: TestCase[]) => {
      setTestCases(newTestCases);
      if (currentFile) {
        await api.saveFile(currentFile, code, newTestCases);
      }
    },
    [currentFile, code]
  );

  const handleRun = useCallback(async () => {
    if (!currentFile) return;
    setIsRunning(true);
    setOutput(null);

    try {
      // Save first
      await api.saveFile(currentFile, code, testCases);

      const result = await api.executeCode(
        code,
        testCases.length > 0 ? testCases : undefined,
        stdin || undefined
      );
      setOutput(result);
    } catch (e: any) {
      setOutput({
        stdout: "",
        stderr: e.message,
        exitCode: 1,
        compileErrors: "",
        timedOut: false,
      });
    } finally {
      setIsRunning(false);
    }
  }, [currentFile, code, testCases, stdin]);

  const handleDelete = useCallback(
    async (name: string) => {
      if (!confirm(`Delete "${name}"?`)) return;
      await api.deleteFile(name);
      if (currentFile === name) {
        setCurrentFile(null);
        setCode("");
        setTestCases([]);
        setOutput(null);
      }
      await refreshFiles();
    },
    [currentFile, refreshFiles]
  );

  return (
    <div className="h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>
      <Header
        currentFile={currentFile}
        isRunning={isRunning}
        isSaving={isSaving}
        onRun={handleRun}
        onNewFile={createNewFile}
        onToggleTests={() => setShowTestCases(!showTestCases)}
        showTestCases={showTestCases}
      />

      <div className="flex flex-1 overflow-hidden">
        <FileExplorer
          files={files}
          currentFile={currentFile}
          onOpen={openFile}
          onNew={createNewFile}
          onDelete={handleDelete}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            {currentFile ? (
              <Editor
                code={code}
                onChange={handleCodeChange}
                errors={lintErrors}
              />
            ) : (
              <div className="h-full flex items-center justify-center" style={{ color: "var(--text-secondary)" }}>
                <div className="text-center">
                  <div className="text-6xl mb-4 opacity-20">{"{ }"}</div>
                  <p className="text-lg mb-2">No file open</p>
                  <p className="text-sm">Create a new file or select one from the sidebar</p>
                </div>
              </div>
            )}
          </div>

          <OutputPanel output={output} isRunning={isRunning} stdin={stdin} onStdinChange={setStdin} />
        </div>

        {showTestCases && (
          <TestCasePanel testCases={testCases} onChange={handleTestCasesChange} />
        )}
      </div>
    </div>
  );
}
