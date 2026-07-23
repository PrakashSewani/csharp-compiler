import { useState, useCallback, useEffect } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileCode2,
  Folder,
  FolderOpen,
  FolderPlus,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  IconButton,
  Button,
  Input,
  InputGroup,
} from "@chakra-ui/react";
import type { SolutionFolder } from "../api";
import { LANGUAGE_LABELS } from "../languages";

interface FileExplorerProps {
  solutions: SolutionFolder[];
  currentSolution: string | null;
  currentFile: string | null;
  onOpenFile: (solution: string, file: string) => void;
  onNewSolution: () => void;
  onNewFile: (solution: string) => void;
  onDeleteSolution: (name: string) => void;
  onDeleteFile: (solution: string, file: string) => void;
}

export function FileExplorer({
  solutions,
  currentSolution,
  currentFile,
  onOpenFile,
  onNewSolution,
  onNewFile,
  onDeleteSolution,
  onDeleteFile,
}: FileExplorerProps) {
  const [search, setSearch] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleFolder = useCallback((name: string) => {
    setExpandedFolders((previous) => {
      const next = new Set(previous);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }, []);

  useEffect(() => {
    if (currentSolution) {
      setExpandedFolders((previous) => new Set(previous).add(currentSolution));
    }
  }, [currentSolution]);

  const query = search.trim().toLowerCase();
  const filteredSolutions = solutions.flatMap((solution) => {
    if (!query) return [solution];
    if (solution.name.toLowerCase().includes(query)) return [solution];

    const files = solution.files.filter((file) => file.name.toLowerCase().includes(query));
    return files.length > 0 ? [{ ...solution, files }] : [];
  });

  return (
    <Box h="100%" display="flex" flexDirection="column" overflow="hidden" bg="bg.panel">
      <Box px={4} pt={4} pb={3} flexShrink={0} borderBottom="1px solid" borderColor="border.subtle">
        <Flex alignItems="center" justifyContent="space-between" gap={4} mb={4}>
          <Box>
            <Text fontSize="sm" fontWeight="700" color="text.primary">
              Practice Library
            </Text>
            <Text fontSize="xs" color="text.muted">
              {solutions.length} collection{solutions.length === 1 ? "" : "s"}
            </Text>
          </Box>
          <IconButton
            aria-label="Create collection"
            title="Create collection"
            size="md"
            variant="subtle"
            colorPalette="blue"
            onClick={onNewSolution}
          >
            <FolderPlus size={17} />
          </IconButton>
        </Flex>

        <InputGroup startElement={<Search size={14} />}>
          <Input
            size="md"
            placeholder="Find a problem"
            aria-label="Search practice library"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </InputGroup>
      </Box>

      <Box flex={1} overflowY="auto" px={3} py={3}>
        {filteredSolutions.length === 0 ? (
          <Flex direction="column" alignItems="center" justifyContent="center" h="full" px={6}>
            <BookOpen size={28} color="currentColor" opacity={0.25} />
            <Text mt={3} fontSize="sm" fontWeight="600" color="text.secondary">
              {query ? "Nothing found" : "Build your practice library"}
            </Text>
            <Text mt={1} fontSize="xs" textAlign="center" color="text.muted">
              {query
                ? "Try a different problem or collection name."
                : "Create a collection, then add your first coding problem."}
            </Text>
            {!query && (
              <Text
                as="button"
                mt={4}
                fontSize="xs"
                fontWeight="700"
                color="accent.blue"
                onClick={onNewSolution}
              >
                Create collection
              </Text>
            )}
          </Flex>
        ) : (
          <VStack gap={3} align="stretch">
            {filteredSolutions.map((solution) => {
              const isExpanded = query ? true : expandedFolders.has(solution.name);
              const isActiveCollection = currentSolution === solution.name;

              return (
                <Box
                  key={solution.name}
                  border="1px solid"
                  borderColor={isActiveCollection ? "border.strong" : "border.subtle"}
                  borderRadius="lg"
                  overflow="hidden"
                  bg="bg.app"
                  boxShadow="none"
                >
                  <Flex
                    alignItems="center"
                    minH="52px"
                    bg={isActiveCollection ? "bg.elevated" : "bg.surface"}
                    borderLeft="3px solid"
                    borderLeftColor={isActiveCollection ? "accent.blue" : "transparent"}
                    _hover={{ bg: "bg.elevated" }}
                  >
                    <Flex
                      as="button"
                      alignItems="center"
                      gap={3}
                      flex={1}
                      w="full"
                      minW={0}
                      minH="52px"
                      px={3}
                      textAlign="left"
                      onClick={() => toggleFolder(solution.name)}
                      aria-expanded={isExpanded}
                    >
                      <Box color="text.muted" flexShrink={0}>
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </Box>
                      <Flex
                        w={8}
                        h={8}
                        alignItems="center"
                        justifyContent="center"
                        borderRadius="md"
                        bg="bg.hover"
                        color={isActiveCollection ? "accent.blue" : "text.muted"}
                        flexShrink={0}
                      >
                        {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
                      </Flex>
                      <Box minW={0} flex={1}>
                        <Text
                          fontSize="sm"
                          fontWeight="700"
                          color={isActiveCollection ? "text.primary" : "text.secondary"}
                          truncate
                        >
                          {solution.name}
                        </Text>
                        <Text fontSize="xs" color="text.muted">
                          {solution.files.length} problem{solution.files.length === 1 ? "" : "s"}
                        </Text>
                      </Box>
                    </Flex>
                  </Flex>

                  {isExpanded && (
                    <VStack gap={1} align="stretch" px={2.5} py={2.5} bg="bg.app">
                      {solution.files.length === 0 ? (
                        <Flex alignItems="center" gap={4} px={3} py={3} borderRadius="md" bg="bg.surface">
                          <Box>
                            <Text fontSize="sm" fontWeight="600" color="text.secondary">No problems yet</Text>
                            <Text fontSize="xs" color="text.muted">Use Add problem below to create an exercise.</Text>
                          </Box>
                        </Flex>
                      ) : (
                        solution.files.map((file) => {
                          const isActive = currentSolution === solution.name && currentFile === file.name;

                          return (
                            <Flex
                              key={file.name}
                              className="library-row"
                              alignItems="center"
                              minH="44px"
                              borderRadius="md"
                              bg={isActive ? "bg.active" : "transparent"}
                              color={isActive ? "text.primary" : "text.secondary"}
                              border="1px solid"
                              borderColor={isActive ? "border.strong" : "transparent"}
                              borderLeft="3px solid"
                              borderLeftColor={isActive ? "accent.blue" : "transparent"}
                              _hover={{ bg: isActive ? "bg.active" : "bg.surface", borderColor: isActive ? "border.strong" : "border.subtle" }}
                              _focusWithin={{ bg: isActive ? "bg.active" : "bg.surface" }}
                            >
                              <Flex
                                as="button"
                                alignItems="center"
                                gap={3}
                                flex={1}
                                w="full"
                                minW={0}
                                minH="44px"
                                px={3.5}
                                textAlign="left"
                                aria-current={isActive ? "page" : undefined}
                                onClick={() => onOpenFile(solution.name, file.name)}
                              >
                                <Flex w={6} h={6} alignItems="center" justifyContent="center" borderRadius="sm" bg="bg.surface" color={isActive ? "accent.blue" : "text.muted"} flexShrink={0}>
                                  <FileCode2 size={14} color="currentColor" />
                                </Flex>
                                 <Text fontSize="sm" fontWeight={isActive ? "700" : "500"} truncate>
                                   {file.name}
                                 </Text>
                                 <Text ml="auto" fontSize="2xs" fontWeight="700" color="text.muted" textTransform="uppercase" letterSpacing="wide">
                                   {LANGUAGE_LABELS[file.languageId]}
                                 </Text>
                              </Flex>
                            </Flex>
                          );
                        })
                      )}
                    </VStack>
                  )}

                  <Flex
                    direction="column"
                    alignItems="stretch"
                    gap={2}
                    px={3}
                    py={3}
                    bg="bg.surface"
                    borderTop="1px solid"
                    borderColor="border.subtle"
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      colorPalette="gray"
                      onClick={() => onNewFile(solution.name)}
                      w="full"
                      justifyContent="center"
                    >
                      <Plus size={15} />
                      Add problem
                    </Button>

                    <VStack gap={2} w="full" align="stretch">
                      {currentSolution === solution.name && currentFile && (
                        <Button
                          aria-label={`Delete selected problem ${currentFile}`}
                          title={`Delete ${currentFile}`}
                          size="sm"
                          variant="ghost"
                          color="text.muted"
                          _hover={{ color: "accent.red", bg: "#2a1215" }}
                          onClick={() => onDeleteFile(solution.name, currentFile)}
                          w="full"
                          justifyContent="center"
                        >
                          <Trash2 size={14} />
                          Delete problem
                        </Button>
                      )}
                      <Button
                        aria-label={`Delete collection ${solution.name}`}
                        title={`Delete collection ${solution.name}`}
                        size="sm"
                        variant="ghost"
                        color="text.muted"
                        _hover={{ color: "accent.red", bg: "#2a1215" }}
                        onClick={() => onDeleteSolution(solution.name)}
                        w="full"
                        justifyContent="center"
                      >
                        <Trash2 size={15} />
                        Delete collection
                      </Button>
                    </VStack>
                  </Flex>
                </Box>
              );
            })}
          </VStack>
        )}
      </Box>
    </Box>
  );
}
