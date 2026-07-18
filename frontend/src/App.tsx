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
import {
  Box,
  Flex,
  HStack,
  Text,
  Kbd,
} from "@chakra-ui/react";
import * as api from "./api";
import type { TestCase, ExecutionResult, LintError, SolutionFolder } from "./api";

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
  const [stdinMap, setStdinMap] = useState<Record<string, string>>({});
  const [newSolutionModalOpen, setNewSolutionModalOpen] = useState(false);
  const [newFileModalOpen, setNewFileModalOpen] = useState(false);
  const [newFileTargetSolution, setNewFileTargetSolution] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

  useEffect(() => {
    refreshSolutions();
  }, [refreshSolutions]);

  const openFile = useCallback(async (solution: string, file: string) => {
    const entry = await api.getFile(solution, file);
    setCurrentSolution(solution);
    setCurrentFile(file);
    setQueuedFile(`${solution}/${file}`);
    setCode(entry.code);
    setTestCases(entry.testCases || []);
    setOutput(null);
    setExecutionErrors([]);
    setLintErrors([]);
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

      if (currentSolution && currentFile) {
        clearTimeout(saveTimer.current);
        setIsSaving(true);
        saveTimer.current = setTimeout(async () => {
          await api.saveFile(currentSolution, currentFile, newCode, testCases);
          setIsSaving(false);
          refreshSolutions();
        }, 1500);
      }

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
    [currentSolution, currentFile, testCases, refreshSolutions]
  );

  const handleTestCasesChange = useCallback(
    async (newTestCases: TestCase[]) => {
      setTestCases(newTestCases);
      if (currentSolution && currentFile) {
        await api.saveFile(currentSolution, currentFile, code, newTestCases);
      }
    },
    [currentSolution, currentFile, code]
  );

  const handleRun = useCallback(async () => {
    if (!queuedFile) return;

    const [solution, file] = queuedFile.split("/");
    const entry = await api.getFile(solution, file);
    const fileStdin = stdinMap[queuedFile] || "";

    setIsRunning(true);
    setOutput(null);
    setExecutionErrors([]);

    try {
      await api.saveFile(solution, file, entry.code, entry.testCases);

      const result = await api.executeCode(
        entry.code,
        entry.testCases.length > 0 ? entry.testCases : undefined,
        fileStdin || undefined
      );
      setOutput(result);
      setExecutionErrors(result.compileErrorsList || []);
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
    } finally {
      setIsRunning(false);
    }
  }, [queuedFile, stdinMap]);

  const handleSave = useCallback(async () => {
    if (currentSolution && currentFile) {
      await api.saveFile(currentSolution, currentFile, code, testCases);
      setIsSaving(true);
      refreshSolutions();
      setTimeout(() => setIsSaving(false), 500);
    }
  }, [currentSolution, currentFile, code, testCases, refreshSolutions]);

  const handleDeleteSolution = useCallback(
    async (name: string) => {
      await api.deleteSolution(name);
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
    <Box h="100vh" display="flex" flexDirection="column" bg="bg.app">
      <Header
        currentSolution={currentSolution}
        currentFile={currentFile}
        queuedFile={queuedFile}
        isRunning={isRunning}
        isSaving={isSaving}
        onRun={handleRun}
        onNewSolution={() => setNewSolutionModalOpen(true)}
        onNewFile={() => handleOpenNewFileModal()}
        onToggleTests={() => setShowTestCases(!showTestCases)}
        showTestCases={showTestCases}
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
      />

      <Group orientation="horizontal" style={{ flex: 1, overflow: "hidden" }}>
        {showSidebar && (
          <>
            <Panel defaultSize="20%" minSize="15%" maxSize="35%">
              <FileExplorer
                solutions={solutions}
                currentSolution={currentSolution}
                currentFile={currentFile}
                queuedFile={queuedFile}
                onOpenFile={openFile}
                onNewSolution={() => setNewSolutionModalOpen(true)}
                onNewFile={(solution) => handleOpenNewFileModal(solution)}
                onDeleteSolution={handleDeleteSolution}
                onDeleteFile={handleDeleteFile}
              />
            </Panel>
            <Separator
              className="resize-handle"
              style={{ background: "#182030", width: 3 }}
            />
          </>
        )}

        <Panel defaultSize={showTestCases ? "55%" : "80%"} minSize="30%">
          <Group orientation="vertical">
            <Panel defaultSize="70%" minSize="30%">
              <Flex direction="column" h="full">
                {/* Editor tab bar */}
                {currentSolution && currentFile && (
                  <Flex
                    alignItems="center"
                    h={10}
                    px={2}
                    flexShrink={0}
                    gap={1}
                    bg="bg.panel"
                    borderBottom="1px solid"
                    borderColor="border.subtle"
                  >
                    <HStack
                      gap={2}
                      px={3}
                      h={7}
                      borderRadius="md"
                      bg="bg.surface"
                      border="1px solid"
                      borderColor="border.default"
                    >
                      <Box w={2} h={2} borderRadius="full" bg="accent.blue" />
                      <Text fontSize="xs" fontWeight="medium" color="text.muted">
                        {currentSolution}/
                      </Text>
                      <Text fontSize="xs" fontWeight="medium" color="text.primary">
                        {currentFile}.cs
                      </Text>
                    </HStack>
                  </Flex>
                )}
                <Box flex={1} overflow="hidden">
                  {currentSolution && currentFile ? (
                    <Editor
                      code={code}
                      onChange={handleCodeChange}
                      errors={errors}
                    />
                  ) : (
                    <Flex
                      h="full"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Box textAlign="center">
                        <Text
                          fontSize="5xl"
                          mb={4}
                          fontFamily="mono"
                          color="text.muted"
                          opacity={0.2}
                        >
                          {"{ }"}
                        </Text>
                        <Text fontSize="sm" mb={1} color="text.secondary">
                          No file open
                        </Text>
                        <Text fontSize="xs" color="text.muted">
                          Create a solution and add files to get started
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

            <Separator
              className="resize-handle"
              style={{ background: "#182030", width: 3 }}
            />

            <Panel defaultSize="30%" minSize="15%" maxSize="60%">
              <OutputPanel
                output={output}
                isRunning={isRunning}
                stdin={currentStdin}
                onStdinChange={handleStdinChange}
                errors={errors}
              />
            </Panel>
          </Group>
        </Panel>

        {showTestCases && (
          <>
            <Separator
              className="resize-handle"
              style={{ background: "#182030", width: 3 }}
            />
            <Panel defaultSize="25%" minSize="15%" maxSize="40%">
              <TestCasePanel
                testCases={testCases}
                onChange={handleTestCasesChange}
                onRunAll={handleRun}
              />
            </Panel>
          </>
        )}
      </Group>

      <StatusBar
        currentFile={currentFile}
        isSaving={isSaving}
        errorCount={errors.length}
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
    </Box>
  );
}
