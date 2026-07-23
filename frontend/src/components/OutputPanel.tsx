import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Keyboard,
  Loader2,
  Terminal,
  PanelBottomClose,
  XCircle,
} from "lucide-react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Button,
  IconButton,
  Textarea,
} from "@chakra-ui/react";
import type { ExecutionResult, LintError } from "../api";

interface OutputPanelProps {
  output: ExecutionResult | null;
  isRunning: boolean;
  stdin: string;
  onStdinChange: (stdin: string) => void;
  errors: LintError[];
  onCollapse: () => void;
}

type Tab = "results" | "problems" | "stdin";

export function OutputPanel({ output, isRunning, stdin, onStdinChange, errors, onCollapse }: OutputPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("results");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (output?.compileErrors) setActiveTab("problems");
    else if (output || isRunning) setActiveTab("results");
  }, [isRunning, output]);

  const fullOutput = [output?.compileErrors, output?.stderr, output?.stdout].filter(Boolean).join("\n");
  const allTestsPassed = output?.testResults
    ? output.testResults.passed === output.testResults.total
    : false;

  const copyOutput = async () => {
    await navigator.clipboard.writeText(fullOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Box h="100%" display="flex" flexDirection="column" overflow="hidden" bg="bg.panel" aria-live="polite">
      <Flex
        alignItems="center"
        justifyContent="space-between"
        gap={5}
        px={4}
        h="52px"
        minH="52px"
        flexShrink={0}
        borderBottom="1px solid"
        borderColor="border.subtle"
      >
        <HStack gap={2} minW={0} overflowX="auto" role="tablist" aria-label="Execution details">
          {([
            ["results", "Results", Terminal],
            ["problems", `Problems${errors.length ? ` ${errors.length}` : ""}`, AlertCircle],
            ["stdin", "Input", Keyboard],
          ] as const).map(([tab, label, Icon]) => (
            <Button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              size="sm"
              px={3.5}
              variant={activeTab === tab ? "subtle" : "ghost"}
              colorPalette={activeTab === tab ? "blue" : "gray"}
              onClick={() => setActiveTab(tab)}
            >
              <Icon size={14} />
              {label}
            </Button>
          ))}
        </HStack>

        <HStack gap={3} flexShrink={0}>
          {isRunning && (
            <HStack gap={2} color="accent.blue">
              <Loader2 size={13} className="animate-spin" />
              <Text fontSize="xs" fontWeight="700">Running</Text>
            </HStack>
          )}
          {!isRunning && output?.testResults && (
            <Text fontSize="xs" fontWeight="700" color={allTestsPassed ? "accent.green" : "accent.yellow"}>
              {output.testResults.passed}/{output.testResults.total} passed
            </Text>
          )}
          {fullOutput && (
            <IconButton aria-label="Copy execution output" title="Copy output" size="sm" variant="ghost" onClick={copyOutput}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </IconButton>
          )}
          <IconButton aria-label="Collapse console" title="Collapse console" size="sm" variant="ghost" onClick={onCollapse}>
            <PanelBottomClose size={15} />
          </IconButton>
        </HStack>
      </Flex>

      <Box flex={1} overflow="auto">
        {activeTab === "results" && (
          <Box p={5}>
            {isRunning ? (
              <Flex alignItems="center" gap={3} minH="100px">
                <Loader2 size={18} className="animate-spin" color="currentColor" />
                <Box>
                  <Text fontSize="sm" fontWeight="700" color="text.primary">Compiling and running</Text>
                  <Text fontSize="xs" color="text.muted">Executing in an isolated .NET sandbox.</Text>
                </Box>
              </Flex>
            ) : !output ? (
              <Flex direction="column" alignItems="center" justifyContent="center" minH="120px" textAlign="center">
                <Terminal size={25} color="currentColor" opacity={0.2} />
                <Text mt={2} fontSize="sm" fontWeight="700" color="text.secondary">Ready to run</Text>
                <Text mt={1} fontSize="xs" color="text.muted">Run the active problem to see results here.</Text>
              </Flex>
            ) : (
              <VStack gap={4} align="stretch">
                {output.timedOut && <ResultNotice tone="warning" title="Execution timed out" detail="The process exceeded the 30 second limit." />}
                {output.exitCode !== 0 && !output.compileErrors && (
                  <ResultNotice tone="error" title="Runtime error" detail={output.stderr || "The program exited with an error."} />
                )}
                {output.testResults?.details.map((detail, index) => (
                  <Flex
                    key={index}
                    alignItems="flex-start"
                    gap={3}
                    p={4}
                    borderRadius="md"
                    bg={detail.passed ? "#0d2418" : "#2a1215"}
                    border="1px solid"
                    borderColor={detail.passed ? "#166534" : "#7f1d1d"}
                  >
                    {detail.passed ? <CheckCircle2 size={16} color="#22c55e" /> : <XCircle size={16} color="#ef4444" />}
                    <Box minW={0} flex={1}>
                      <Text fontSize="sm" fontWeight="700" color={detail.passed ? "accent.green" : "accent.red"}>
                        Case {index + 1} {detail.passed ? "passed" : "failed"}
                      </Text>
                      {!detail.passed && (
                        <Box mt={2} fontFamily="mono" fontSize="xs">
                          <Text color="text.muted">Expected <Box as="span" color="accent.green">{detail.expected}</Box></Text>
                          <Text color="text.muted">Received <Box as="span" color="accent.red">{detail.actual}</Box></Text>
                        </Box>
                      )}
                    </Box>
                  </Flex>
                ))}
                {output.stdout && !output.testResults && (
                  <Box as="pre" p={3} borderRadius="md" bg="bg.app" border="1px solid" borderColor="border.subtle" fontFamily="mono" fontSize="sm" whiteSpace="pre-wrap" color="text.primary">
                    {output.stdout}
                  </Box>
                )}
                {!output.stdout && !output.stderr && !output.testResults && !output.compileErrors && (
                  <ResultNotice tone="success" title="Run completed" detail="The program finished without producing output." />
                )}
              </VStack>
            )}
          </Box>
        )}

        {activeTab === "problems" && (
          <Box p={4}>
            {errors.length === 0 ? (
              <Flex direction="column" alignItems="center" justifyContent="center" minH="120px" textAlign="center">
                <CheckCircle2 size={25} color="#22c55e" opacity={0.35} />
                <Text mt={2} fontSize="sm" fontWeight="700" color="text.secondary">No compiler problems</Text>
                <Text mt={1} fontSize="xs" color="text.muted">Diagnostics will appear here as you work.</Text>
              </Flex>
            ) : (
              <VStack gap={2} align="stretch">
                {errors.map((error, index) => (
                  <Flex
                    as="button"
                    key={`${error.line}:${error.column}:${index}`}
                    alignItems="center"
                    gap={3}
                    w="full"
                    p={3}
                    textAlign="left"
                    borderRadius="md"
                    _hover={{ bg: "bg.surface" }}
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("navigate-to-line", { detail: { line: error.line } }));
                    }}
                  >
                    {error.severity === "error" ? <XCircle size={14} color="#ef4444" /> : <AlertTriangle size={14} color="#facc15" />}
                    <Text fontSize="xs" fontFamily="mono" color="text.muted">{error.line}:{error.column}</Text>
                    <Text fontSize="sm" color="text.primary" truncate>{error.message}</Text>
                  </Flex>
                ))}
              </VStack>
            )}
          </Box>
        )}

        {activeTab === "stdin" && (
          <Box p={5}>
            <Text id="program-input-label" display="block" mb={1.5} fontSize="xs" fontWeight="700" color="text.secondary">
              Console input
            </Text>
            <Text mb={3} fontSize="xs" color="text.muted">This value is piped to Console.ReadLine() when the program runs.</Text>
            <Textarea
              id="program-input"
              aria-labelledby="program-input-label"
              value={stdin}
              onChange={(event) => onStdinChange(event.target.value)}
              placeholder="Enter stdin"
              minH="120px"
              fontFamily="mono"
              fontSize="sm"
              resize="vertical"
              spellCheck={false}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}

function ResultNotice({ tone, title, detail }: { tone: "success" | "warning" | "error"; title: string; detail: string }) {
  const colors = {
    success: { accent: "accent.green", background: "#0d2418", border: "#166534" },
    warning: { accent: "accent.yellow", background: "#2a2410", border: "#854d0e" },
    error: { accent: "accent.red", background: "#2a1215", border: "#7f1d1d" },
  }[tone];

  return (
    <Box p={3} borderRadius="md" bg={colors.background} border="1px solid" borderColor={colors.border}>
      <Text fontSize="sm" fontWeight="700" color={colors.accent}>{title}</Text>
      <Text mt={1} fontSize="xs" whiteSpace="pre-wrap" color="text.secondary">{detail}</Text>
    </Box>
  );
}
