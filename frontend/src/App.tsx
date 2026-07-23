import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { FileExplorer } from "./components/FileExplorer";
import { Editor } from "./components/Editor";
import { OutputPanel } from "./components/OutputPanel";
import { TestCasePanel } from "./components/TestCasePanel";
import { Header } from "./components/Header";
import { StatusBar } from "./components/StatusBar";
import { CommandPalette } from "./components/CommandPalette";
import { ConfirmDeleteModal, NewSolutionModal, NewProblemModal } from "./components/Modals";
import type { NewProblemValues } from "./components/Modals";
import { SettingsModal } from "./components/SettingsModal";
import {
  Box,
  Flex,
  HStack,
  Text,
  Kbd,
} from "@chakra-ui/react";
import * as api from "./api";
import type { TestCase, ExecutionResult, LintError, SolutionFolder, LanguageId, ExecutionMode, RuntimeCapabilities, FileEntry } from "./api";
import { sourceFileName, starterTemplate } from "./languages";

const ERRORS_STORAGE_PREFIX = "compiler-diagnostics:";

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
  const [languageId, setLanguageId] = useState<LanguageId>("csharp");
  const [runtimeId, setRuntimeId] = useState("dotnet-8");
  const [sourceName, setSourceName] = useState("Main.cs");
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("stdin");
  const [scratchStdin, setScratchStdin] = useState("");
  const [capabilities, setCapabilities] = useState<RuntimeCapabilities>(api.LEGACY_CAPABILITIES);
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isNarrow, setIsNarrow] = useState(false);
  const [output, setOutput] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [executionErrors, setExecutionErrors] = useState<LintError[]>([]);
  const [lintErrors, setLintErrors] = useState<LintError[]>([]);
  const [showTestCases, setShowTestCases] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showOutput, setShowOutput] = useState(true);
  const [newSolutionModalOpen, setNewSolutionModalOpen] = useState(false);
  const [newFileModalOpen, setNewFileModalOpen] = useState(false);
  const [newFileTargetSolution, setNewFileTargetSolution] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: "collection"; name: string }
    | { kind: "problem"; solution: string; name: string }
    | null
  >(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  const pendingSaveCount = useRef(0);
  const diagnosticNavigator = useRef<((line: number, column?: number) => void) | null>(null);

  const currentFileKey = currentSolution && currentFile ? `${currentSolution}/${currentFile}` : null;
  const language = capabilities.languages.find((item) => item.id === languageId) || api.LEGACY_CAPABILITIES.languages[0];
  const runtime = language.runtimes.find((item) => item.id === runtimeId) || language.runtimes[0];

  const errors = useMemo(
    () => (executionErrors.length > 0 ? executionErrors : lintErrors),
    [executionErrors, lintErrors]
  );

  const documentPayload = useCallback((nextCode = code, nextTestCases = testCases, overrides: Partial<FileEntry> = {}) => ({
    schemaVersion: 2,
    languageId,
    runtimeId,
    sourceFileName: sourceName,
    executionMode,
    scratchStdin,
    code: nextCode,
    testCases: nextTestCases,
    ...overrides,
  }), [code, executionMode, languageId, runtimeId, scratchStdin, sourceName, testCases]);

  const refreshSolutions = useCallback(async () => {
    try {
      const list = await api.listSolutions();
      setSolutions(list);
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load collections.");
    }
  }, []);

  const saveDocument = useCallback(
    (solution: string, file: string, document: ReturnType<typeof documentPayload>) => {
      pendingSaveCount.current += 1;
      setIsSaving(true);

      const save = saveChain.current
        .catch(() => undefined)
        .then(() => api.saveFile(solution, file, document));

      saveChain.current = save.catch(() => undefined);

      return save.then(() => setSaveError(""), (error) => {
        setSaveError(error instanceof Error ? error.message : "Save failed.");
        throw error;
      }).finally(() => {
        pendingSaveCount.current -= 1;
        if (pendingSaveCount.current === 0) setIsSaving(false);
      });
    },
    []
  );

  useEffect(() => {
    refreshSolutions();
    api.getRuntimes()
      .then(setCapabilities)
      .catch(() => setCapabilities(api.LEGACY_CAPABILITIES))
      .finally(() => setCapabilitiesLoading(false));
  }, [refreshSolutions]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const update = () => setIsNarrow(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const openFile = useCallback(async (solution: string, file: string) => {
    const entry = await api.getFile(solution, file);
    const fileKey = `${solution}/${file}`;
    setCurrentSolution(solution);
    setCurrentFile(file);
    setQueuedFile(fileKey);
    setCode(entry.code);
    setTestCases(entry.testCases || []);
    setLanguageId(entry.languageId);
    setRuntimeId(entry.runtimeId);
    setSourceName(entry.sourceFileName);
    setExecutionMode(entry.executionMode);
    setScratchStdin(entry.scratchStdin);
    setSaveError("");
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

  const createNewFile = useCallback(async (values: NewProblemValues) => {
    if (!values.name?.trim()) return;
    const targetSolution = newFileTargetSolution || currentSolution;
    if (!targetSolution) return;

    const cleanName = values.name.trim().replace(/[^a-zA-Z0-9_-]/g, "");
    if (!cleanName) return;
    const capability = capabilities.languages.find((item) => item.id === values.languageId);
    const fileName = sourceFileName(cleanName, values.languageId, capability);
    const template = values.useStarter ? starterTemplate(values.languageId, values.executionMode, fileName) : "";

    await api.saveFile(targetSolution, cleanName, {
      schemaVersion: 2,
      languageId: values.languageId,
      runtimeId: values.runtimeId,
      sourceFileName: fileName,
      executionMode: values.executionMode,
      scratchStdin: "",
      code: template,
      testCases: [],
    });
    await refreshSolutions();
    await openFile(targetSolution, cleanName);
    setNewFileModalOpen(false);
    setNewFileTargetSolution(null);
  }, [capabilities.languages, currentSolution, newFileTargetSolution, refreshSolutions, openFile]);

  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);
      setExecutionErrors([]);
      setLintErrors([]);
      if (currentFileKey) clearPersistedErrors(currentFileKey);

      if (currentSolution && currentFile) {
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          void saveDocument(currentSolution, currentFile, documentPayload(newCode, testCases))
            .then(refreshSolutions)
            .catch((error) => console.error("Autosave failed:", error));
        }, 1500);
      }

      clearTimeout(lintTimer.current);
      lintTimer.current = setTimeout(async () => {
        if (newCode.trim().length > 20) {
          try {
            const result = await api.lintCode(languageId, runtimeId, newCode);
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
    [currentSolution, currentFile, currentFileKey, testCases, refreshSolutions, saveDocument, documentPayload, languageId, runtimeId]
  );

  const handleTestCasesChange = useCallback(
    (newTestCases: TestCase[]) => {
      setTestCases(newTestCases);
      if (currentSolution && currentFile) {
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          void saveDocument(currentSolution, currentFile, documentPayload(code, newTestCases))
            .then(refreshSolutions)
            .catch((error) => console.error("Autosave failed:", error));
        }, 800);
      }
    },
    [currentSolution, currentFile, code, refreshSolutions, saveDocument, documentPayload]
  );

  const handleRun = useCallback(async (forcedMode?: ExecutionMode) => {
    if (!queuedFile) return;

    const separator = queuedFile.indexOf("/");
    const solution = queuedFile.slice(0, separator);
    const file = queuedFile.slice(separator + 1);
    const isCurrentFile = queuedFile === currentFileKey;
    const entry = isCurrentFile
      ? documentPayload(code, testCases, forcedMode ? { executionMode: forcedMode } : {})
      : await api.getFile(solution, file);

    setIsRunning(true);
    setOutput(null);
    setExecutionErrors([]);

    try {
      if (isCurrentFile) {
        clearTimeout(saveTimer.current);
        await saveDocument(solution, file, entry);
      }

      const result = await api.executeCode({
        languageId: entry.languageId,
        runtimeId: entry.runtimeId,
        executionMode: entry.executionMode,
        code: entry.code,
        testCases: entry.executionMode === "tests" ? entry.testCases : undefined,
        stdin: entry.executionMode === "stdin" ? entry.scratchStdin || undefined : undefined,
      });
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
  }, [queuedFile, currentFileKey, saveDocument, documentPayload, code, testCases]);

  const handleExecutionModeChange = useCallback((mode: ExecutionMode) => {
    setExecutionMode(mode);
    if (currentSolution && currentFile) {
      void saveDocument(currentSolution, currentFile, documentPayload(code, testCases, { executionMode: mode }));
    }
  }, [code, currentFile, currentSolution, documentPayload, saveDocument, testCases]);

  const handleStdinChange = useCallback((value: string) => {
    setScratchStdin(value);
    if (currentSolution && currentFile) {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void saveDocument(currentSolution, currentFile, documentPayload(code, testCases, { scratchStdin: value }));
      }, 800);
    }
  }, [code, currentFile, currentSolution, documentPayload, saveDocument, testCases]);

  const handleSave = useCallback(async () => {
    if (currentSolution && currentFile) {
      clearTimeout(saveTimer.current);
      await saveDocument(currentSolution, currentFile, documentPayload());
      await refreshSolutions();
    }
  }, [currentSolution, currentFile, refreshSolutions, saveDocument, documentPayload]);

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
        setLanguageId("csharp");
        setRuntimeId("dotnet-8");
        setSourceName("Main.cs");
        setExecutionMode("stdin");
        setScratchStdin("");
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
        setLintErrors([]);
        setLanguageId("csharp");
        setRuntimeId("dotnet-8");
        setSourceName("Main.cs");
        setExecutionMode("stdin");
        setScratchStdin("");
      }
      if (queuedFile === `${solution}/${file}`) {
        setQueuedFile(null);
      }
      await refreshSolutions();
    },
    [currentSolution, currentFile, queuedFile, refreshSolutions]
  );

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete || isDeleting) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      if (pendingDelete.kind === "collection") {
        await handleDeleteSolution(pendingDelete.name);
      } else {
        await handleDeleteFile(pendingDelete.solution, pendingDelete.name);
      }
      setPendingDelete(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setIsDeleting(false);
    }
  }, [handleDeleteFile, handleDeleteSolution, isDeleting, pendingDelete]);

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
        onRun={() => handleRun()}
        onToggleTests={() => setShowTestCases((visible) => !visible)}
        showTestCases={showTestCases}
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar((visible) => !visible)}
        showOutput={showOutput}
        onToggleOutput={() => setShowOutput((visible) => !visible)}
        onOpenSettings={() => setSettingsModalOpen(true)}
        testSummary={output?.testResults}
        languageLabel={language.label}
        runtimeLabel={runtime?.label || runtimeId}
      />

      {(loadError || saveError || capabilitiesLoading) && (
        <Flex px={5} py={2} bg={loadError || saveError ? "#2a1215" : "bg.surface"} color={loadError || saveError ? "accent.red" : "text.muted"} fontSize="xs" justify="space-between">
          <Text>{loadError || (saveError ? `Save failed: ${saveError}` : "Loading runtime capabilities...")}</Text>
          {loadError && <Text as="button" fontWeight="700" onClick={refreshSolutions}>Retry</Text>}
        </Flex>
      )}

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
                  onDeleteSolution={(name) => {
                    setDeleteError("");
                    setPendingDelete({ kind: "collection", name });
                  }}
                  onDeleteFile={(solution, name) => {
                    setDeleteError("");
                    setPendingDelete({ kind: "problem", solution, name });
                  }}
                />
              </Box>
            </Panel>
            <Separator
              className="resize-handle"
              style={{ width: 5 }}
            />
          </>
        )}

        {!(isNarrow && showTestCases) && <Panel defaultSize={showTestCases ? "53%" : "77%"} minSize="320px">
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
                         {sourceName}
                      </Text>
                      <Text fontSize="xs" color="text.muted" display={{ base: "none", md: "block" }}>
                         {currentFile} in {currentSolution}
                      </Text>
                    </HStack>
                     <HStack gap={3} flexShrink={0}>
                       <Text fontSize="xs" fontFamily="mono" color="text.muted" display={{ base: "none", md: "block" }}>{language.label} / {runtime?.label || runtimeId}</Text>
                       <select className="ide-select ide-select--compact" aria-label="Execution mode" value={executionMode} onChange={(event) => handleExecutionModeChange(event.target.value as ExecutionMode)}>
                         <option value="stdin">Standard input</option>
                         <option value="tests">Test cases</option>
                       </select>
                     </HStack>
                  </Flex>
                )}
                <Box flex={1} overflow="hidden">
                  {currentSolution && currentFile ? (
                    <Editor
                      code={code}
                      onChange={handleCodeChange}
                       onRun={() => handleRun()}
                      onSave={handleSave}
                       errors={errors}
                       language={language.monacoLanguage}
                       onNavigateReady={(navigate) => { diagnosticNavigator.current = navigate; }}
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
                    stdin={scratchStdin}
                    onStdinChange={handleStdinChange}
                    errors={errors}
                    onCollapse={() => setShowOutput(false)}
                    languageLabel={language.label}
                    runtimeLabel={runtime?.label || runtimeId}
                    onNavigateDiagnostic={(line, column) => diagnosticNavigator.current?.(line, column)}
                  />
                </Panel>
              </>
            )}
          </Group>
        </Panel>}

        {showTestCases && (
          <>
            {!isNarrow && <Separator
              className="resize-handle"
              style={{ width: 5 }}
            />}
            <Panel defaultSize={isNarrow ? "100%" : "24%"} minSize="280px" {...(!isNarrow ? { maxSize: "440px" } : {})}>
              <Box h="full">
                <TestCasePanel
                  testCases={testCases}
                  onChange={handleTestCasesChange}
                  onRunAll={() => {
                    handleExecutionModeChange("tests");
                    void handleRun("tests");
                  }}
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
        languageLabel={language.label}
        runtimeLabel={runtime?.label || runtimeId}
        saveError={saveError}
      />

      <NewSolutionModal
        open={newSolutionModalOpen}
        onClose={() => setNewSolutionModalOpen(false)}
        onSubmit={createNewSolution}
      />

      <NewProblemModal
        open={newFileModalOpen}
        onClose={() => {
          setNewFileModalOpen(false);
          setNewFileTargetSolution(null);
        }}
        onSubmit={createNewFile}
        solutionName={newFileTargetSolution || currentSolution}
        languages={capabilities.languages}
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
        onRun={() => handleRun()}
        onToggleTests={() => setShowTestCases((s) => !s)}
        onToggleSidebar={() => setShowSidebar((s) => !s)}
        onSave={handleSave}
      />

      <SettingsModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onSettingsChanged={refreshSolutions}
      />

      <ConfirmDeleteModal
        open={pendingDelete !== null}
        kind={pendingDelete?.kind || "problem"}
        name={pendingDelete?.name || ""}
        collectionName={pendingDelete?.kind === "problem" ? pendingDelete.solution : undefined}
        loading={isDeleting}
        error={deleteError}
        onClose={() => {
          if (!isDeleting) {
            setDeleteError("");
            setPendingDelete(null);
          }
        }}
        onConfirm={() => void confirmDelete()}
      />
    </Box>
  );
}
