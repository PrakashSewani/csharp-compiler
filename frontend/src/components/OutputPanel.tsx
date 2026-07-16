import { useState } from "react";
import {
  Terminal,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Keyboard,
  Copy,
  Check,
} from "lucide-react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Badge,
  Button,
  IconButton,
  Separator,
  Kbd,
} from "@chakra-ui/react";
import type { ExecutionResult } from "../api";

interface OutputPanelProps {
  output: ExecutionResult | null;
  isRunning: boolean;
  stdin: string;
  onStdinChange: (stdin: string) => void;
}

interface StatusInfo {
  icon: React.ReactNode;
  text: string;
  colorPalette: string;
  variant: string;
}

function getStatus(isRunning: boolean, output: ExecutionResult | null): StatusInfo {
  if (isRunning) {
    return {
      icon: <Loader2 size={12} className="animate-spin" />,
      text: "Compiling & Running...",
      colorPalette: "blue",
      variant: "subtle",
    };
  }
  if (!output) {
    return { icon: null, text: "Ready", colorPalette: "gray", variant: "outline" };
  }
  if (output.timedOut) {
    return {
      icon: <Clock size={12} />,
      text: "Timed Out",
      colorPalette: "yellow",
      variant: "subtle",
    };
  }
  if (output.compileErrors) {
    return {
      icon: <XCircle size={12} />,
      text: "Compilation Failed",
      colorPalette: "red",
      variant: "subtle",
    };
  }
  if (output.exitCode !== 0) {
    return {
      icon: <XCircle size={12} />,
      text: `Runtime Error`,
      colorPalette: "red",
      variant: "subtle",
    };
  }
  if (output.testResults) {
    const allPassed = output.testResults.passed === output.testResults.total;
    return {
      icon: allPassed ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />,
      text: `${output.testResults.passed}/${output.testResults.total} Tests`,
      colorPalette: allPassed ? "green" : "yellow",
      variant: "subtle",
    };
  }
  return {
    icon: <CheckCircle2 size={12} />,
    text: "Success",
    colorPalette: "green",
    variant: "subtle",
  };
}

export function OutputPanel({
  output,
  isRunning,
  stdin,
  onStdinChange,
}: OutputPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<"output" | "stdin">("output");
  const [copied, setCopied] = useState(false);

  const status = getStatus(isRunning, output);

  const getFullOutput = () => {
    if (!output) return "";
    const parts: string[] = [];
    if (output.compileErrors) parts.push(output.compileErrors);
    if (output.stderr && !output.compileErrors) parts.push(output.stderr);
    if (output.stdout) parts.push(output.stdout);
    return parts.join("\n");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getFullOutput());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box
      h="100%"
      display="flex"
      flexDirection="column"
      bg="bg.panel"
    >
      {/* Title bar */}
      <Flex
        alignItems="center"
        justifyContent="space-between"
        px={4}
        h={10}
        flexShrink={0}
        cursor="pointer"
        userSelect="none"
        borderBottom={expanded ? "1px solid" : "none"}
        borderColor="border.subtle"
        onClick={() => setExpanded(!expanded)}
      >
        <HStack gap={3}>
          <Terminal size={13} color="#546478" />
          <Text fontSize="xs" fontWeight="medium" color="text.secondary">
            Output
          </Text>
          {status.text !== "Ready" && (
            <Badge size="sm" colorPalette={status.colorPalette} variant={status.variant as any}>
              {status.text}
            </Badge>
          )}
          {status.icon}
        </HStack>

        <HStack gap={2}>
          {output?.testResults && (
            <Badge
              size="sm"
              colorPalette={
                output.testResults.passed === output.testResults.total ? "green" : "red"
              }
              variant="subtle"
              fontFamily="mono"
              fontWeight="bold"
            >
              {output.testResults.passed}/{output.testResults.total}
            </Badge>
          )}

          {expanded && output && (
            <IconButton
              aria-label="Copy output"
              size="xs"
              variant="ghost"
              color={copied ? "accent.green" : "text.muted"}
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
            </IconButton>
          )}

          {expanded ? (
            <ChevronDown size={14} color="#546478" />
          ) : (
            <ChevronUp size={14} color="#546478" />
          )}
        </HStack>
      </Flex>

      {/* Content */}
      {expanded && (
        <Box flex={1} display="flex" flexDirection="column" overflow="hidden">
          {/* Tabs */}
          <HStack
            gap={0}
            h={9}
            flexShrink={0}
            px={2}
            borderBottom="1px solid"
            borderColor="border.subtle"
          >
            {(["output", "stdin"] as const).map((tab) => (
              <Button
                key={tab}
                size="xs"
                variant="ghost"
                color={activeTab === tab ? "text.primary" : "text.muted"}
                borderBottom="2px solid"
                borderBottomColor={activeTab === tab ? "accent.blue" : "transparent"}
                borderRadius="none"
                px={3}
                fontWeight="semibold"
                onClick={() => setActiveTab(tab)}
              >
                {tab === "stdin" && <Keyboard size={12} />}
                {tab === "output" ? "Output" : "Stdin"}
              </Button>
            ))}
          </HStack>

          {/* Tab content */}
          <Box flex={1} overflow="auto">
            {activeTab === "output" ? (
              <Box p={4}>
                {isRunning ? (
                  <HStack gap={3} py={4}>
                    <Loader2 size={16} className="animate-spin" color="#3b82f6" />
                    <Box>
                      <Text fontSize="sm" fontWeight="medium" color="text.primary">
                        Compiling and running...
                      </Text>
                      <Text fontSize="2xs" color="text.muted">
                        Spawning sandbox container
                      </Text>
                    </Box>
                  </HStack>
                ) : output ? (
                  <VStack gap={3} align="stretch">
                    {output.compileErrors && (
                      <Box>
                        <Text
                          fontSize="2xs"
                          fontWeight="bold"
                          textTransform="uppercase"
                          letterSpacing="wider"
                          mb={2}
                          color="accent.red"
                        >
                          Compilation Errors
                        </Text>
                        <Box
                          as="pre"
                          fontSize="xs"
                          fontFamily="mono"
                          whiteSpace="pre-wrap"
                          p={3}
                          borderRadius="lg"
                          lineHeight="relaxed"
                          bg="accent.red/6"
                          color="accent.red"
                          border="1px solid"
                          borderColor="accent.red/15"
                        >
                          {output.compileErrors}
                        </Box>
                      </Box>
                    )}

                    {output.stderr && !output.compileErrors && (
                      <Box>
                        <Text
                          fontSize="2xs"
                          fontWeight="bold"
                          textTransform="uppercase"
                          letterSpacing="wider"
                          mb={2}
                          color="accent.yellow"
                        >
                          Stderr
                        </Text>
                        <Box
                          as="pre"
                          fontSize="xs"
                          fontFamily="mono"
                          whiteSpace="pre-wrap"
                          p={3}
                          borderRadius="lg"
                          lineHeight="relaxed"
                          bg="accent.yellow/6"
                          color="accent.yellow"
                          border="1px solid"
                          borderColor="accent.yellow/15"
                        >
                          {output.stderr}
                        </Box>
                      </Box>
                    )}

                    {output.testResults && (
                      <Box>
                        <Text
                          fontSize="2xs"
                          fontWeight="bold"
                          textTransform="uppercase"
                          letterSpacing="wider"
                          mb={2}
                          color={
                            output.testResults.passed === output.testResults.total
                              ? "accent.green"
                              : "accent.yellow"
                          }
                        >
                          Test Results
                        </Text>
                        <VStack gap={2} align="stretch">
                          {output.testResults.details.map((d, i) => (
                            <Flex
                              key={i}
                              fontSize="xs"
                              fontFamily="mono"
                              p={3}
                              borderRadius="lg"
                              alignItems="flex-start"
                              gap={3}
                              bg={d.passed ? "accent.green/6" : "accent.red/6"}
                              border="1px solid"
                              borderColor={d.passed ? "accent.green/15" : "accent.red/15"}
                            >
                              {d.passed ? (
                                <CheckCircle2
                                  size={14}
                                  color="#22c55e"
                                  style={{ flexShrink: 0, marginTop: 2 }}
                                />
                              ) : (
                                <XCircle
                                  size={14}
                                  color="#ef4444"
                                  style={{ flexShrink: 0, marginTop: 2 }}
                                />
                              )}
                              <Box flex={1} minW={0}>
                                <HStack gap={2}>
                                  <Text
                                    fontWeight="semibold"
                                    color={d.passed ? "accent.green" : "accent.red"}
                                  >
                                    Test {i + 1}: {d.passed ? "PASS" : "FAIL"}
                                  </Text>
                                  <Text
                                    fontSize="2xs"
                                    fontFamily="mono"
                                    px={1.5}
                                    py={0.5}
                                    borderRadius="md"
                                    bg="bg.hover"
                                    color="text.muted"
                                    truncate
                                    maxW="200px"
                                  >
                                    {d.input.slice(0, 30)}
                                    {d.input.length > 30 ? "..." : ""}
                                  </Text>
                                </HStack>
                                {!d.passed && (
                                  <VStack gap={0.5} align="stretch" mt={1}>
                                    <Text color="text.muted">
                                      Expected: <Text as="span" color="accent.green">{d.expected}</Text>
                                    </Text>
                                    <Text color="text.muted">
                                      Got: <Text as="span" color="accent.red">{d.actual}</Text>
                                    </Text>
                                  </VStack>
                                )}
                              </Box>
                            </Flex>
                          ))}
                        </VStack>
                      </Box>
                    )}

                    {output.stdout && (
                      <Box>
                        <Text
                          fontSize="2xs"
                          fontWeight="bold"
                          textTransform="uppercase"
                          letterSpacing="wider"
                          mb={2}
                          color="text.muted"
                        >
                          Program Output
                        </Text>
                        <Box
                          as="pre"
                          fontSize="xs"
                          fontFamily="mono"
                          whiteSpace="pre-wrap"
                          p={3}
                          borderRadius="lg"
                          lineHeight="relaxed"
                          bg="bg.surface"
                          color="text.primary"
                          border="1px solid"
                          borderColor="border.subtle"
                        >
                          {output.stdout}
                        </Box>
                      </Box>
                    )}

                    {!output.stdout &&
                      !output.stderr &&
                      !output.compileErrors &&
                      !output.testResults && (
                        <Text fontSize="xs" py={4} color="text.muted">
                          (No output)
                        </Text>
                      )}
                  </VStack>
                ) : (
                  <Flex flexDirection="column" alignItems="center" justifyContent="center" py={8}>
                    <Box mb={2}>
                      <Terminal size={24} color="#546478" style={{ opacity: 0.3 }} />
                    </Box>
                    <Text fontSize="xs" color="text.muted">
                      Click{" "}
                      <Text as="span" fontWeight="semibold" color="accent.green">
                        Run
                      </Text>{" "}
                      or press{" "}
                      <Kbd fontSize="2xs">Ctrl</Kbd>+<Kbd fontSize="2xs">Enter</Kbd> to execute
                    </Text>
                  </Flex>
                )}
              </Box>
            ) : (
              <Box p={4}>
                <Text fontSize="xs" mb={2} color="text.secondary">
                  Input for{" "}
                  <Text as="span" fontFamily="mono" color="accent.purple">
                    Console.ReadLine()
                  </Text>
                </Text>
                <textarea
                  style={{
                    width: "100%",
                    height: "96px",
                    padding: "12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    resize: "none",
                    outline: "none",
                    background: "#0e1319",
                    color: "#f0f4f8",
                    border: "1px solid #182030",
                  }}
                  placeholder="Enter input here..."
                  spellCheck={false}
                  value={stdin}
                  onChange={(e) => onStdinChange(e.target.value)}
                />
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
