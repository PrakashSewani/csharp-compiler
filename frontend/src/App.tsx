import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { FileExplorer } from "./components/FileExplorer";
import { Editor } from "./components/Editor";
import { OutputPanel } from "./components/OutputPanel";
import { TestCasePanel } from "./components/TestCasePanel";
import { Header } from "./components/Header";
import { StatusBar } from "./components/StatusBar";
import { CommandPalette } from "./components/CommandPalette";
import { NewSolutionModal, NewFileModal } from "./components/Modals";
import { SettingsModal } from "./components/SettingsModal";
import {
  Box,
  Flex,
  HStack,
  Text,
  Kbd,
} from "@chakra-ui/react";
import * as api from "./api";
import type { TestCase, ExecutionResult, LintError, SolutionFolder } from "./api";

const ERRORS_STORAGE_PREFIX = "csharp-compiler-errors:";

function loadPersistedErrors(fileKey: string): LintError[] {
  try {
    const raw = localStorage.getItem(ERRORS_STORAGE_PREFIX + fileKey);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function persistErrors(fileKey: string, errors: LintError[]) {
  try {
    localStorage.setItem(ERRORS_STORAGE_PREFIX + fileKey, JSON.stringify(errors));
  } catch {}
}

function clearPersistedErrors(fileKey: string) {
  localStorage.removeItem(ERRORS_STORAGE_PREFIX + fileKey);
}

function clearPersistedErrorsForSolution(solution: string) {
  const prefix = ERRORS_STORAGE_PREFIX + solution + "/";
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) keysToRemove.push(key);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

export default function App() {
  const [solutions, setSolutions] = useState<SolutionFolder[]>([]);
  const [currentSolution, setCurrentSolution] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [queuedFile, setQueuedFile] = useState<string | null>(null);
  const [code, setCode] = useState<string>("");
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [output, setOutput] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [executionErrors, setExecutionErrors] = useState<LintError[]>([]);
  const [lintErrors, setLintErrors] = useState<LintError[]>([]);
  const [showTestCases, setShowTestCases] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showOutput, setShowOutput] = useState(true);
  const [stdinMap, setStdinMap] = useState<Record<string, string>>({});
  const [newSolutionModalOpen, setNewSolutionModalOpen] = useState(false);
  const [newFileModalOpen, setNewFileModalOpen] = useState(false);
  const [newFileTargetSolution, setNewFileTargetSolution] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  const pendingSaveCount = useRef(0);

  const currentFileKey = currentSolution && currentFile ? `${currentSolution}/${currentFile}` : null;
  const currentStdin = currentFileKey ? (stdinMap[currentFileKey] || "") : "";

  const errors = useMemo(
    () => (executionErrors.length > 0 ? executionErrors : lintErrors),
    [executionErrors, lintErrors]
  );

  const handleStdinChange = useCallback((value: string) => {
    if (currentFileKey) {
      setStdinMap((prev) => ({ ...prev, [currentFileKey]: value }));
    }
  }, [currentFileKey]);

  const refreshSolutions = useCallback(async () => {
    const list = await api.listSolutions();
    setSolutions(list);
  }, []);

  const saveDocument = useCallback(
    (solution: string, file: string, nextCode: string, nextTestCases: TestCase[]) => {
      pendingSaveCount.current += 1;
      setIsSaving(true);

      const save = saveChain.current
        .catch(() => undefined)
        .then(() => api.saveFile(solution, file, nextCode, nextTestCases));

      saveChain.current = save.catch(() => undefined);

      return save.finally(() => {
        pendingSaveCount.current -= 1;
        if (pendingSaveCount.current === 0) setIsSaving(false);
      });
    },
    []
  );

  useEffect(() => {
    refreshSolutions();
  }, [refreshSolutions]);

  const openFile = useCallback(async (solution: string, file: string) => {
    const entry = await api.getFile(solution, file);
    const fileKey = `${solution}/${file}`;
    setCurrentSolution(solution);
    setCurrentFile(file);
    setQueuedFile(fileKey);
    setCode(entry.code);
    setTestCases(entry.testCases || []);
    setOutput(null);
    setExecutionErrors(loadPersistedErrors(fileKey));
    setLintErrors(loadPersistedErrors(fileKey));
  }, []);

  const createNewSolution = useCallback(async (name: string) => {
    if (!name?.trim()) return;
    await api.createSolution(name);
    await refreshSolutions();
    setNewSolutionModalOpen(false);
  }, [refreshSolutions]);

  const createNewFile = useCallback(async (name: string) => {
    if (!name?.trim()) return;
    const targetSolution = newFileTargetSolution || currentSolution;
    if (!targetSolution) return;

    const cleanName = name.trim().replace(/[^a-zA-Z0-9_]/g, "");
    if (!cleanName) return;

    const template = `using System;
using System.Collections.Generic;
using System.Linq;

public class Solution
{
    public static object Solve(string input)
    {
        // input: test case input (from Test Cases panel) or null
        // Stdin: read with Console.ReadLine() from Stdin tab

        // Example: read from stdin
        // var line = Console.ReadLine();

        return "";
    }
}
`;

    await api.saveFile(targetSolution, cleanName, template, []);
    await refreshSolutions();
    await openFile(targetSolution, cleanName);
    setNewFileModalOpen(false);
    setNewFileTargetSolution(null);
  }, [currentSolution, newFileTargetSolution, refreshSolutions, openFile]);

  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);
      setExecutionErrors([]);
      setLintErrors([]);
      if (currentFileKey) clearPersistedErrors(currentFileKey);

      if (currentSolution && currentFile) {
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          void saveDocument(currentSolution, currentFile, newCode, testCases)
            .then(refreshSolutions)
            .catch((error) => console.error("Autosave failed:", error));
        }, 1500);
      }

      clearTimeout(lintTimer.current);
      lintTimer.current = setTimeout(async () => {
        if (newCode.trim().length > 20) {
          try {
            const result = await api.lintCode(newCode);
            setLintErrors(result.errors);
            if (currentFileKey) persistErrors(currentFileKey, result.errors);
          } catch {
            setLintErrors([]);
          }
        } else {
          setLintErrors([]);
        }
      }, 2000);
    },
    [currentSolution, currentFile, currentFileKey, testCases, refreshSolutions, saveDocument]
  );

  const handleTestCasesChange = useCallback(
    (newTestCases: TestCase[]) => {
      setTestCases(newTestCases);
      if (currentSolution && currentFile) {
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          void saveDocument(currentSolution, currentFile, code, newTestCases)
            .then(refreshSolutions)
            .catch((error) => console.error("Autosave failed:", error));
        }, 800);
      }
    },
    [currentSolution, currentFile, code, refreshSolutions, saveDocument]
  );

  const handleRun = useCallback(async () => {
    if (!queuedFile) return;

    const [solution, file] = queuedFile.split("/");
    const isCurrentFile = queuedFile === currentFileKey;
    const entry = isCurrentFile
      ? { code, testCases }
      : await api.getFile(solution, file);
    const fileStdin = stdinMap[queuedFile] || "";

    setIsRunning(true);
    setOutput(null);
    setExecutionErrors([]);

    try {
      if (isCurrentFile) {
        clearTimeout(saveTimer.current);
        await saveDocument(solution, file, entry.code, entry.testCases);
      }

      const result = await api.executeCode(
        entry.code,
        entry.testCases.length > 0 ? entry.testCases : undefined,
        fileStdin || undefined
      );
      setOutput(result);
      const compileErrors = result.compileErrorsList || [];
      setExecutionErrors(compileErrors);
      persistErrors(queuedFile, compileErrors);
    } catch (e: any) {
      setOutput({
        stdout: "",
        stderr: e.message,
        exitCode: 1,
        compileErrors: "",
        compileErrorsList: [],
        timedOut: false,
      });
      setExecutionErrors([]);
      clearPersistedErrors(queuedFile);
    } finally {
      setIsRunning(false);
    }
  }, [queuedFile, currentFileKey, code, testCases, stdinMap, saveDocument]);

  const handleSave = useCallback(async () => {
    if (currentSolution && currentFile) {
      clearTimeout(saveTimer.current);
      await saveDocument(currentSolution, currentFile, code, testCases);
      await refreshSolutions();
    }
  }, [currentSolution, currentFile, code, testCases, refreshSolutions, saveDocument]);

  const handleDeleteSolution = useCallback(
    async (name: string) => {
      await api.deleteSolution(name);
      clearPersistedErrorsForSolution(name);
      if (currentSolution === name) {
        setCurrentSolution(null);
        setCurrentFile(null);
        setCode("");
        setTestCases([]);
        setOutput(null);
        setExecutionErrors([]);
        setLintErrors([]);
        setQueuedFile(null);
      }
      if (queuedFile && queuedFile.startsWith(`${name}/`)) {
        setQueuedFile(null);
      }
      await refreshSolutions();
    },
    [currentSolution, queuedFile, refreshSolutions]
  );

  const handleDeleteFile = useCallback(
    async (solution: string, file: string) => {
      await api.deleteFile(solution, file);
      clearPersistedErrors(`${solution}/${file}`);
      if (currentSolution === solution && currentFile === file) {
        setCurrentFile(null);
        setCode("");
        setTestCases([]);
        setOutput(null);
        setExecutionErrors([]);
      }
      if (queuedFile === `${solution}/${file}`) {
        setQueuedFile(null);
      }
      await refreshSolutions();
    },
    [currentSolution, currentFile, queuedFile, refreshSolutions]
  );

  const handleOpenNewFileModal = useCallback((solution?: string) => {
    setNewFileTargetSolution(solution || null);
    setNewFileModalOpen(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((o) => !o);
        return;
      }

      if (commandPaletteOpen) return;

      if (mod && e.key === "Enter") {
        e.preventDefault();
        handleRun();
      }
      if (mod && e.key === "n") {
        e.preventDefault();
        setNewSolutionModalOpen(true);
      }
      if (mod && e.key === "b") {
        e.preventDefault();
        setShowSidebar((s) => !s);
      }
      if (mod && e.shiftKey && e.key === "T") {
        e.preventDefault();
        setShowTestCases((s) => !s);
      }
      if (mod && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleRun, handleSave, commandPaletteOpen]);

  return (
    <Box h="100dvh" display="flex" flexDirection="column" bg="bg.app">
      <Header
        currentSolution={currentSolution}
        currentFile={currentFile}
        isRunning={isRunning}
        onRun={handleRun}
        onToggleTests={() => setShowTestCases((visible) => !visible)}
        showTestCases={showTestCases}
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar((visible) => !visible)}
        showOutput={showOutput}
        onToggleOutput={() => setShowOutput((visible) => !visible)}
        onOpenSettings={() => setSettingsModalOpen(true)}
        testSummary={output?.testResults}
      />

      <Group orientation="horizontal" style={{ flex: 1, overflow: "hidden" }}>
        {showSidebar && (
          <>
            <Panel defaultSize="23%" minSize="280px" maxSize="420px">
              <Box h="full">
                <FileExplorer
                  solutions={solutions}
                  currentSolution={currentSolution}
                  currentFile={currentFile}
                  onOpenFile={openFile}
                  onNewSolution={() => setNewSolutionModalOpen(true)}
                  onNewFile={(solution) => handleOpenNewFileModal(solution)}
                  onDeleteSolution={handleDeleteSolution}
                  onDeleteFile={handleDeleteFile}
                />
              </Box>
            </Panel>
            <Separator
              className="resize-handle"
              style={{ width: 5 }}
            />
          </>
        )}

        <Panel defaultSize={showTestCases ? "53%" : "77%"} minSize="420px">
          <Group orientation="vertical">
            <Panel defaultSize={showOutput ? "70%" : "100%"} minSize="30%">
              <Flex direction="column" h="full">
                {currentSolution && currentFile && (
                  <Flex
                    alignItems="center"
                    justifyContent="space-between"
                    h="52px"
                    minH="52px"
                    px={5}
                    flexShrink={0}
                    bg="bg.panel"
                    borderBottom="1px solid"
                    borderColor="border.subtle"
                  >
                    <HStack gap={3} minW={0}>
                      <Box w={2} h={2} borderRadius="full" bg="accent.blue" boxShadow="0 0 0 3px rgba(59, 130, 246, 0.12)" />
                      <Text fontSize="sm" fontWeight="700" color="text.primary" truncate>
                        {currentFile}
                      </Text>
                      <Text fontSize="xs" color="text.muted" display={{ base: "none", md: "block" }}>
                        in {currentSolution}
                      </Text>
                    </HStack>
                    <Text fontSize="xs" fontFamily="mono" color="text.muted">C# / .NET 8</Text>
                  </Flex>
                )}
                <Box flex={1} overflow="hidden">
                  {currentSolution && currentFile ? (
                    <Editor
                      code={code}
                      onChange={handleCodeChange}
                      onRun={handleRun}
                      onSave={handleSave}
                      errors={errors}
                    />
                  ) : (
                    <Flex
                      h="full"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Box textAlign="center">
                        <Text fontSize="xl" mb={1} fontWeight="700" color="text.secondary">
                          Choose a problem to begin
                        </Text>
                        <Text fontSize="xs" color="text.muted">
                          Open one from your practice library or create a new collection.
                        </Text>
                        <HStack justify="center" gap={2} mt={3}>
                          <Kbd fontSize="2xs">Ctrl+K</Kbd>
                          <Text fontSize="2xs" color="text.muted">
                            for command palette
                          </Text>
                        </HStack>
                      </Box>
                    </Flex>
                  )}
                </Box>
              </Flex>
            </Panel>

            {showOutput && (
              <>
                <Separator className="resize-handle" style={{ height: 5 }} />
                <Panel defaultSize="30%" minSize="15%" maxSize="60%">
                  <OutputPanel
                    output={output}
                    isRunning={isRunning}
                    stdin={currentStdin}
                    onStdinChange={handleStdinChange}
                    errors={errors}
                    onCollapse={() => setShowOutput(false)}
                  />
                </Panel>
              </>
            )}
          </Group>
        </Panel>

        {showTestCases && (
          <>
            <Separator
              className="resize-handle"
              style={{ width: 5 }}
            />
            <Panel defaultSize="24%" minSize="300px" maxSize="440px">
              <Box h="full">
                <TestCasePanel
                  testCases={testCases}
                  onChange={handleTestCasesChange}
                  onRunAll={handleRun}
                  onCollapse={() => setShowTestCases(false)}
                />
              </Box>
            </Panel>
          </>
        )}
      </Group>

      <StatusBar
        isSaving={isSaving}
        errorCount={errors.length}
        testCount={testCases.length}
      />

      <NewSolutionModal
        open={newSolutionModalOpen}
        onClose={() => setNewSolutionModalOpen(false)}
        onSubmit={createNewSolution}
      />

      <NewFileModal
        open={newFileModalOpen}
        onClose={() => {
          setNewFileModalOpen(false);
          setNewFileTargetSolution(null);
        }}
        onSubmit={createNewFile}
        solutionName={newFileTargetSolution || currentSolution}
      />

      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        solutions={solutions}
        currentSolution={currentSolution}
        currentFile={currentFile}
        onOpenFile={openFile}
        onNewSolution={() => setNewSolutionModalOpen(true)}
        onNewFile={() => handleOpenNewFileModal()}
        onRun={handleRun}
        onToggleTests={() => setShowTestCases((s) => !s)}
        onToggleSidebar={() => setShowSidebar((s) => !s)}
        onSave={handleSave}
      />

      <SettingsModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onSettingsChanged={refreshSolutions}
      />
    </Box>
  );
}
