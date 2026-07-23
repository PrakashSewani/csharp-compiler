import { useEffect, useState } from "react";
import { Copy, FlaskConical, PanelRightClose, Play, Plus, Trash2 } from "lucide-react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  IconButton,
  Button,
  Textarea,
} from "@chakra-ui/react";
import type { TestCase } from "../api";

interface TestCasePanelProps {
  testCases: TestCase[];
  onChange: (testCases: TestCase[]) => void;
  onRunAll: () => void;
  onCollapse: () => void;
}

export function TestCasePanel({ testCases, onChange, onRunAll, onCollapse }: TestCasePanelProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (testCases.length === 0) setSelectedIndex(0);
    else if (selectedIndex >= testCases.length) setSelectedIndex(testCases.length - 1);
  }, [selectedIndex, testCases.length]);

  const addTestCase = () => {
    const next = [...testCases, { input: "", expectedOutput: "" }];
    onChange(next);
    setSelectedIndex(next.length - 1);
  };

  const updateTestCase = (field: "input" | "expectedOutput", value: string) => {
    const next = [...testCases];
    next[selectedIndex] = { ...next[selectedIndex], [field]: value };
    onChange(next);
  };

  const duplicateTestCase = () => {
    if (!testCases[selectedIndex]) return;
    const next = [
      ...testCases.slice(0, selectedIndex + 1),
      { ...testCases[selectedIndex] },
      ...testCases.slice(selectedIndex + 1),
    ];
    onChange(next);
    setSelectedIndex(selectedIndex + 1);
  };

  const removeTestCase = () => {
    onChange(testCases.filter((_, index) => index !== selectedIndex));
  };

  const selected = testCases[selectedIndex];

  return (
    <Box h="100%" display="flex" flexDirection="column" overflow="hidden" bg="bg.panel">
      <Flex
        alignItems="center"
        justifyContent="space-between"
        gap={4}
        px={4}
        h="56px"
        minH="56px"
        flexShrink={0}
        borderBottom="1px solid"
        borderColor="border.subtle"
      >
        <HStack gap={2.5}>
          <FlaskConical size={17} />
          <Text fontSize="sm" fontWeight="700" color="text.primary">
            Cases
          </Text>
          <Text fontSize="xs" color="text.muted">
            {testCases.length}
          </Text>
        </HStack>
        <HStack gap={2}>
          <IconButton aria-label="Collapse cases" title="Collapse cases" size="md" variant="ghost" onClick={onCollapse}>
            <PanelRightClose size={16} />
          </IconButton>
          <IconButton aria-label="Add case" title="Add case" size="md" variant="subtle" colorPalette="blue" onClick={addTestCase}>
            <Plus size={16} />
          </IconButton>
          <Button
            size="md"
            px={4}
            colorPalette="blue"
            onClick={onRunAll}
            disabled={testCases.length === 0}
          >
            <Play size={15} fill="currentColor" />
            Run all
          </Button>
        </HStack>
      </Flex>

      {testCases.length === 0 ? (
        <Flex direction="column" alignItems="center" justifyContent="center" flex={1} px={7} textAlign="center">
          <FlaskConical size={30} color="currentColor" opacity={0.2} />
          <Text mt={3} fontSize="sm" fontWeight="700" color="text.secondary">
            Add a sample case
          </Text>
          <Text mt={1} fontSize="xs" lineHeight="1.6" color="text.muted">
            Each input is sent to the program as standard input. Its standard output is compared with the expected output.
          </Text>
          <Button mt={4} size="sm" variant="subtle" colorPalette="blue" onClick={addTestCase}>
            <Plus size={14} />
            Add first case
          </Button>
        </Flex>
      ) : (
        <>
          <HStack
            gap={2}
            px={4}
            py={3}
            flexShrink={0}
            overflowX="auto"
            borderBottom="1px solid"
            borderColor="border.subtle"
          >
            {testCases.map((testCase, index) => (
              <Button
                key={index}
                size="sm"
                minW={10}
                variant={selectedIndex === index ? "subtle" : "ghost"}
                colorPalette={selectedIndex === index ? "blue" : "gray"}
                onClick={() => setSelectedIndex(index)}
                flexShrink={0}
                aria-pressed={selectedIndex === index}
              >
                <Box
                  w={1.5}
                  h={1.5}
                  borderRadius="full"
                  bg={testCase.input || testCase.expectedOutput ? "accent.blue" : "text.muted"}
                />
                {index + 1}
              </Button>
            ))}
          </HStack>

          {selected && (
            <Box flex={1} overflowY="auto" p={4}>
              <Flex alignItems="center" justifyContent="space-between" gap={4} mb={5}>
                <Box>
                  <Text fontSize="sm" fontWeight="700" color="text.primary">
                    Case {selectedIndex + 1}
                  </Text>
                  <Text fontSize="xs" color="text.muted">
                    Define standard input and the expected standard output.
                  </Text>
                </Box>
                <HStack gap={2}>
                  <IconButton
                    aria-label="Duplicate selected case"
                    title="Duplicate case"
                    size="md"
                    variant="subtle"
                    onClick={duplicateTestCase}
                  >
                    <Copy size={15} />
                  </IconButton>
                  <IconButton
                    aria-label="Delete selected case"
                    title="Delete case"
                    size="md"
                    variant="ghost"
                    colorPalette="red"
                    onClick={removeTestCase}
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </HStack>
              </Flex>

              <VStack gap={5} align="stretch">
                <Box>
                  <Text id="case-input-label" display="block" mb={1.5} fontSize="xs" fontWeight="700" color="text.secondary">
                    Input
                  </Text>
                  <Textarea
                    id="case-input"
                    aria-labelledby="case-input-label"
                    value={selected.input}
                    onChange={(event) => updateTestCase("input", event.target.value)}
                    placeholder="Example input"
                    minH="128px"
                    fontFamily="mono"
                    fontSize="sm"
                    resize="vertical"
                  />
                </Box>
                <Box>
                  <Text id="case-output-label" display="block" mb={1.5} fontSize="xs" fontWeight="700" color="text.secondary">
                    Expected output
                  </Text>
                  <Textarea
                    id="case-output"
                    aria-labelledby="case-output-label"
                    value={selected.expectedOutput}
                    onChange={(event) => updateTestCase("expectedOutput", event.target.value)}
                    placeholder="Expected result"
                    minH="128px"
                    fontFamily="mono"
                    fontSize="sm"
                    resize="vertical"
                  />
                </Box>
              </VStack>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
