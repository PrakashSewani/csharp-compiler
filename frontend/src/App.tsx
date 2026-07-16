import { useState, useCallback, useEffect, useRef } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { FileExplorer } from "./components/FileExplorer";
import { Editor } from "./components/Editor";
import { OutputPanel } from "./components/OutputPanel";
import { TestCasePanel } from "./components/TestCasePanel";
import { Header } from "./components/Header";
import { StatusBar } from "./components/StatusBar";
import { CommandPalette } from "./components/CommandPalette";
import {
  Box,
  Flex,
  HStack,
  Text,
  Button,
  Input,
  Kbd,
} from "@chakra-ui/react";
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
  const [showSidebar, setShowSidebar] = useState(true);
  const [stdin, setStdin] = useState("");
  const [newFileModalOpen, setNewFileModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
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

  const createNewFile = useCallback(async (name: string) => {
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
    setNewFileModalOpen(false);
  }, [refreshFiles, openFile]);

  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);

      if (currentFile) {
        clearTimeout(saveTimer.current);
        setIsSaving(true);
        saveTimer.current = setTimeout(async () => {
          await api.saveFile(currentFile, newCode, testCases);
          setIsSaving(false);
          refreshFiles();
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

  const handleSave = useCallback(async () => {
    if (currentFile) {
      await api.saveFile(currentFile, code, testCases);
      setIsSaving(true);
      refreshFiles();
      setTimeout(() => setIsSaving(false), 500);
    }
  }, [currentFile, code, testCases, refreshFiles]);

  const handleDelete = useCallback(
    async (name: string) => {
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
        setNewFileModalOpen(true);
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
  }, [handleRun, handleSave, currentFile, code, testCases, commandPaletteOpen]);

  return (
    <Box h="100vh" display="flex" flexDirection="column" bg="bg.app">
      <Header
        currentFile={currentFile}
        isRunning={isRunning}
        isSaving={isSaving}
        onRun={handleRun}
        onNewFile={() => setNewFileModalOpen(true)}
        onToggleTests={() => setShowTestCases(!showTestCases)}
        showTestCases={showTestCases}
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
      />

      <Group orientation="horizontal" className="flex-1 overflow-hidden">
        {showSidebar && (
          <>
            <Panel defaultSize="20%" minSize="15%" maxSize="35%">
              <FileExplorer
                files={files}
                currentFile={currentFile}
                onOpen={openFile}
                onNew={() => setNewFileModalOpen(true)}
                onDelete={handleDelete}
              />
            </Panel>
            <Separator
              className="resize-handle w-[3px]"
              style={{ background: "#182030" }}
            />
          </>
        )}

        <Panel defaultSize={showTestCases ? "55%" : "80%"} minSize="30%">
          <Group orientation="vertical">
            <Panel defaultSize="70%" minSize="30%">
              <Flex direction="column" h="full">
                {/* Editor tab bar */}
                {currentFile && (
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
                      <Text fontSize="xs" fontWeight="medium" color="text.primary">
                        {currentFile}.cs
                      </Text>
                    </HStack>
                  </Flex>
                )}
                <Box flex={1} overflow="hidden">
                  {currentFile ? (
                    <Editor
                      code={code}
                      onChange={handleCodeChange}
                      errors={lintErrors}
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
                          Create a new file or select one from the sidebar
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
              className="resize-handle h-[3px]"
              style={{ background: "#182030" }}
            />

            <Panel defaultSize="30%" minSize="15%" maxSize="60%">
              <OutputPanel
                output={output}
                isRunning={isRunning}
                stdin={stdin}
                onStdinChange={setStdin}
              />
            </Panel>
          </Group>
        </Panel>

        {showTestCases && (
          <>
            <Separator
              className="resize-handle w-[3px]"
              style={{ background: "#182030" }}
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
        lintErrorCount={lintErrors.length}
      />

      <NewFileModal
        open={newFileModalOpen}
        onClose={() => setNewFileModalOpen(false)}
        onSubmit={createNewFile}
      />

      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        files={files}
        currentFile={currentFile}
        onOpenFile={openFile}
        onNewFile={() => { setNewFileModalOpen(true); }}
        onRun={handleRun}
        onToggleTests={() => setShowTestCases((s) => !s)}
        onToggleSidebar={() => setShowSidebar((s) => !s)}
        onSave={handleSave}
      />
    </Box>
  );
}

function NewFileModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(name);
  };

  if (!open) return null;

  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={50}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={4}
      bg="black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Box
        w="full"
        maxW="sm"
        borderRadius="xl"
        p={6}
        bg="bg.elevated"
        border="1px solid"
        borderColor="border.default"
        boxShadow="lg"
      >
        <Text fontSize="sm" fontWeight="bold" mb={4} color="text.primary">
          New File
        </Text>
        <form onSubmit={handleSubmit}>
          <Text
            fontSize="2xs"
            fontWeight="bold"
            textTransform="uppercase"
            letterSpacing="wider"
            display="block"
            mb={1.5}
            color="text.muted"
          >
            Class Name
          </Text>
          <Input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. TwoSum, MergeSort"
            fontFamily="mono"
            size="sm"
          />
          <Flex justify="flex-end" gap={2} mt={5}>
            <Button size="sm" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              colorPalette="green"
              disabled={!name.trim()}
            >
              Create
            </Button>
          </Flex>
        </form>
      </Box>
    </Box>
  );
}
