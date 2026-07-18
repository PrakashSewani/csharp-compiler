import { useState } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Copy,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
} from "lucide-react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  IconButton,
  Badge,
  Textarea,
} from "@chakra-ui/react";
import type { TestCase } from "../api";

interface TestCasePanelProps {
  testCases: TestCase[];
  onChange: (testCases: TestCase[]) => void;
  onRunAll: () => void;
}

export function TestCasePanel({ testCases, onChange, onRunAll }: TestCasePanelProps) {
  const [expanded, setExpanded] = useState<number | null>(0);

  const addTestCase = () => {
    const newCases = [...testCases, { input: "", expectedOutput: "" }];
    onChange(newCases);
    setExpanded(newCases.length - 1);
  };

  const duplicateTestCase = (index: number) => {
    const original = testCases[index];
    const newCases = [
      ...testCases.slice(0, index + 1),
      { ...original },
      ...testCases.slice(index + 1),
    ];
    onChange(newCases);
    setExpanded(index + 1);
  };

  const removeTestCase = (index: number) => {
    const newCases = testCases.filter((_, i) => i !== index);
    onChange(newCases);
    if (expanded === index) setExpanded(null);
    else if (expanded !== null && expanded > index) setExpanded(expanded - 1);
  };

  const moveTestCase = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= testCases.length) return;
    const newCases = [...testCases];
    [newCases[index], newCases[newIndex]] = [newCases[newIndex], newCases[index]];
    onChange(newCases);
    setExpanded(newIndex);
  };

  const updateTestCase = (
    index: number,
    field: "input" | "expectedOutput",
    value: string
  ) => {
    const newCases = [...testCases];
    newCases[index] = { ...newCases[index], [field]: value };
    onChange(newCases);
  };

  return (
    <Box
      h="100%"
      display="flex"
      flexDirection="column"
      overflow="hidden"
      bg="bg.panel"
      animation="panel-slide-in-right 200ms ease-out"
    >
      {/* Header */}
      <Flex
        alignItems="center"
        justifyContent="space-between"
        px={4}
        pt={4}
        pb={3}
        flexShrink={0}
        borderBottom="1px solid"
        borderColor="border.subtle"
      >
        <HStack gap={2}>
          <Text
            fontSize="2xs"
            fontWeight="bold"
            textTransform="uppercase"
            letterSpacing="widest"
            color="text.muted"
          >
            Test Cases
          </Text>
          {testCases.length > 0 && (
            <Badge size="sm" colorPalette="purple" variant="subtle">
              {testCases.length}
            </Badge>
          )}
        </HStack>
        <IconButton
          aria-label="Add test case"
          size="xs"
          variant="outline"
          colorPalette="purple"
          onClick={addTestCase}
        >
          <Plus size={13} />
        </IconButton>
      </Flex>

      {/* Test case list */}
      <Box flex={1} overflowY="auto" p={3}>
        {testCases.length === 0 ? (
          <Flex
            direction="column"
            alignItems="center"
            justifyContent="center"
            h="full"
            px={4}
            py={8}
          >
            <Box
              w={12}
              h={12}
              borderRadius="xl"
              display="flex"
              alignItems="center"
              justifyContent="center"
              mb={3}
              bg="bg.surface"
            >
              <Plus size={24} color="#546478" opacity={0.4} />
            </Box>
            <Text
              fontSize="xs"
              textAlign="center"
              lineHeight="relaxed"
              color="text.muted"
            >
              No test cases yet
            </Text>
            <Text
              fontSize="2xs"
              textAlign="center"
              mt={1}
              color="text.muted"
            >
              Your{" "}
              <Text as="span" fontFamily="mono" fontWeight="semibold" color="accent.purple">
                Solution.Solve()
              </Text>{" "}
              method will be called with each input
            </Text>
            <Text
              as="button"
              fontSize="xs"
              fontWeight="medium"
              mt={3}
              color="accent.purple"
              onClick={addTestCase}
              _hover={{ textDecoration: "underline" }}
            >
              Add your first test case
            </Text>
          </Flex>
        ) : (
          <VStack gap={2} align="stretch">
            {testCases.map((tc, i) => {
              const isOpen = expanded === i;
              const hasContent = tc.input || tc.expectedOutput;

              return (
                <Box
                  key={i}
                  borderRadius="lg"
                  overflow="hidden"
                  transition="all 150ms"
                  border="1px solid"
                  borderColor={isOpen ? "border.strong" : "border.subtle"}
                  bg={isOpen ? "bg.surface" : "bg.elevated"}
                >
                  {/* Accordion header */}
                  <Flex
                    alignItems="center"
                    gap={2}
                    px={3}
                    py={2.5}
                    cursor="pointer"
                    userSelect="none"
                    borderBottom={isOpen ? "1px solid" : "none"}
                    borderColor="border.subtle"
                    onClick={() => setExpanded(isOpen ? null : i)}
                    _hover={{ bg: "bg.hover" }}
                  >
                    <Box color="text.muted">
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </Box>
                    <Text
                      fontSize="xs"
                      fontWeight="semibold"
                      flex={1}
                      color="text.primary"
                    >
                      Test {i + 1}
                    </Text>
                    {hasContent && !isOpen && (
                      <Text
                        fontSize="2xs"
                        fontFamily="mono"
                        px={1.5}
                        py={0.5}
                        borderRadius="md"
                        maxW="120px"
                        truncate
                        bg="bg.hover"
                        color="text.muted"
                      >
                        {tc.input || "(empty)"}
                      </Text>
                    )}
                    <HStack gap={0.5}>
                      <IconButton
                        aria-label="Move up"
                        size="2xs"
                        variant="ghost"
                        disabled={i === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveTestCase(i, "up");
                        }}
                      >
                        <ChevronUp size={11} />
                      </IconButton>
                      <IconButton
                        aria-label="Move down"
                        size="2xs"
                        variant="ghost"
                        disabled={i === testCases.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveTestCase(i, "down");
                        }}
                      >
                        <ChevronDownIcon size={11} />
                      </IconButton>
                      <IconButton
                        aria-label="Duplicate"
                        size="2xs"
                        variant="ghost"
                        colorPalette="purple"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateTestCase(i);
                        }}
                      >
                        <Copy size={11} />
                      </IconButton>
                      <IconButton
                        aria-label="Delete"
                        size="2xs"
                        variant="ghost"
                        colorPalette="red"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTestCase(i);
                        }}
                      >
                        <Trash2 size={11} />
                      </IconButton>
                    </HStack>
                  </Flex>

                  {/* Accordion content */}
                  {isOpen && (
                    <Box p={3}>
                      <VStack gap={3} align="stretch">
                        <Box>
                          <Text
                            fontSize="2xs"
                            fontWeight="bold"
                            textTransform="uppercase"
                            letterSpacing="wider"
                            mb={1.5}
                            color="text.muted"
                          >
                            Input
                          </Text>
                          <Textarea
                            size="sm"
                            value={tc.input}
                            onChange={(e) => updateTestCase(i, "input", e.target.value)}
                            placeholder="e.g. [2,7,11,15] 9"
                            h={20}
                            fontFamily="mono"
                            resize="none"
                          />
                        </Box>
                        <Box>
                          <Text
                            fontSize="2xs"
                            fontWeight="bold"
                            textTransform="uppercase"
                            letterSpacing="wider"
                            mb={1.5}
                            color="text.muted"
                          >
                            Expected Output
                          </Text>
                          <Textarea
                            size="sm"
                            value={tc.expectedOutput}
                            onChange={(e) =>
                              updateTestCase(i, "expectedOutput", e.target.value)
                            }
                            placeholder="e.g. [0,1]"
                            h={20}
                            fontFamily="mono"
                            resize="none"
                          />
                        </Box>
                      </VStack>
                    </Box>
                  )}
                </Box>
              );
            })}
          </VStack>
        )}
      </Box>

      {/* Footer hint */}
      {testCases.length > 0 && (
        <Box
          px={4}
          py={3}
          flexShrink={0}
          borderTop="1px solid"
          borderColor="border.subtle"
          bg="bg.panel"
        >
          <Text fontSize="2xs" lineHeight="relaxed" color="text.muted">
            Implement{" "}
            <Text as="span" fontFamily="mono" fontWeight="semibold" color="accent.purple">
              Solution.Solve(string input)
            </Text>{" "}
            and return a value. Compared as string.
          </Text>
        </Box>
      )}
    </Box>
  );
}
