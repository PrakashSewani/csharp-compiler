import { useState, useCallback, useRef, useEffect } from "react";
import {
  FileCode,
  Plus,
  Trash2,
  FolderOpen,
  Folder,
  ChevronRight,
  ChevronDown,
  Search,
  Play,
  CornerDownRight,
} from "lucide-react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  IconButton,
  Input,
  InputGroup,
  Kbd,
} from "@chakra-ui/react";
import type { SolutionFolder } from "../api";

interface FileExplorerProps {
  solutions: SolutionFolder[];
  currentSolution: string | null;
  currentFile: string | null;
  queuedFile: string | null;
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
  queuedFile,
  onOpenFile,
  onNewSolution,
  onNewFile,
  onDeleteSolution,
  onDeleteFile,
}: FileExplorerProps) {
  const [search, setSearch] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);

  const toggleFolder = useCallback((name: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (currentSolution && !expandedFolders.has(currentSolution)) {
      setExpandedFolders((prev) => new Set(prev).add(currentSolution));
    }
  }, [currentSolution]);

  const filteredSolutions = solutions
    .map((sol) => {
      if (!search) return sol;
      const matchingFiles = sol.files.filter((f) =>
        f.name.toLowerCase().includes(search.toLowerCase())
      );
      if (
        matchingFiles.length > 0 ||
        sol.name.toLowerCase().includes(search.toLowerCase())
      ) {
        return { ...sol, files: matchingFiles };
      }
      return null;
    })
    .filter(Boolean) as SolutionFolder[];

  const totalFiles = solutions.reduce((sum, s) => sum + s.files.length, 0);

  return (
    <Box h="100%" display="flex" flexDirection="column" overflow="hidden" bg="bg.panel">
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
          <FolderOpen size={13} color="#546478" />
          <Text
            fontSize="2xs"
            fontWeight="bold"
            textTransform="uppercase"
            letterSpacing="widest"
            color="text.muted"
          >
            Explorer
          </Text>
          {totalFiles > 0 && (
            <Text
              fontSize="2xs"
              px={1.5}
              py={0.5}
              borderRadius="full"
              fontWeight="bold"
              bg="bg.hover"
              color="text.muted"
            >
              {totalFiles}
            </Text>
          )}
        </HStack>
        <IconButton
          aria-label="New solution"
          size="xs"
          variant="outline"
          onClick={onNewSolution}
          title="New Solution (folder)"
        >
          <Plus size={13} />
        </IconButton>
      </Flex>

      {/* Search */}
      <Box px={3} pb={3} pt={2} flexShrink={0}>
        <InputGroup startElement={<Box pl={2}><Search size={12} color="#546478" /></Box>}>
          <Input
            size="sm"
            placeholder="Search files..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearch(e.target.value)
            }
            fontFamily="mono"
          />
        </InputGroup>
      </Box>

      {/* Tree */}
      <Box ref={listRef} flex={1} overflowY="auto" px={2} pb={2}>
        {filteredSolutions.length === 0 ? (
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
              <FolderOpen size={24} color="#546478" opacity={0.5} />
            </Box>
            <Text fontSize="xs" textAlign="center" lineHeight="relaxed" color="text.muted">
              {search ? "No matching files" : "No solutions yet"}
            </Text>
            {!search && (
              <Text
                as="button"
                fontSize="xs"
                fontWeight="medium"
                mt={2}
                color="accent.blue"
                onClick={onNewSolution}
                _hover={{ textDecoration: "underline" }}
              >
                Create your first solution
              </Text>
            )}
          </Flex>
        ) : (
          <VStack gap={0} align="stretch">
            {filteredSolutions.map((sol) => {
              const isExpanded = expandedFolders.has(sol.name);
              const isActiveSolution = currentSolution === sol.name;

              return (
                <Box key={sol.name}>
                  {/* Folder row */}
                  <Flex
                    alignItems="center"
                    gap={2}
                    px={2}
                    py={2}
                    borderRadius="md"
                    cursor="pointer"
                    transition="all 100ms"
                    bg={isActiveSolution ? "bg.hover" : "transparent"}
                    onClick={() => toggleFolder(sol.name)}
                    _hover={{ bg: "bg.hover" }}
                  >
                    <Box w={4} h={4} display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                      {isExpanded ? (
                        <ChevronDown size={14} color="#8494a7" />
                      ) : (
                        <ChevronRight size={14} color="#8494a7" />
                      )}
                    </Box>
                    <Box
                      w={6}
                      h={6}
                      borderRadius="md"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      flexShrink={0}
                      bg={isActiveSolution ? "accent.blue/15" : "bg.surface"}
                    >
                      {isExpanded ? (
                        <FolderOpen size={14} color={isActiveSolution ? "#3b82f6" : "#546478"} />
                      ) : (
                        <Folder size={14} color={isActiveSolution ? "#3b82f6" : "#546478"} />
                      )}
                    </Box>
                    <Text
                      fontSize="xs"
                      fontWeight="semibold"
                      flex={1}
                      truncate
                      color={isActiveSolution ? "text.primary" : "text.secondary"}
                    >
                      {sol.name}
                    </Text>
                    <HStack gap={1} flexShrink={0}>
                      <Text fontSize="2xs" color="text.muted">
                        {sol.files.length}
                      </Text>
                      <IconButton
                        aria-label="Add file to solution"
                        size="2xs"
                        variant="ghost"
                        color="text.muted"
                        _hover={{ color: "accent.blue", bg: "accent.blue/10" }}
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          onNewFile(sol.name);
                        }}
                        title={`New file in ${sol.name}`}
                      >
                        <Plus size={12} />
                      </IconButton>
                      <IconButton
                        aria-label="Delete solution"
                        size="2xs"
                        variant="ghost"
                        color="text.muted"
                        _hover={{ color: "accent.red", bg: "accent.red/10" }}
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          onDeleteSolution(sol.name);
                        }}
                      >
                        <Trash2 size={12} />
                      </IconButton>
                    </HStack>
                  </Flex>

                  {/* Files under folder */}
                  {isExpanded && (
                    <Box pl={5}>
                      {sol.files.length === 0 ? (
                        <Flex alignItems="center" gap={2} px={2} py={2} pl={10}>
                          <Text fontSize="2xs" color="text.muted" fontStyle="italic">
                            No files yet
                          </Text>
                        </Flex>
                      ) : (
                        sol.files.map((file) => {
                          const isActive =
                            currentSolution === sol.name && currentFile === file.name;
                          const isQueued = queuedFile === `${sol.name}/${file.name}`;

                          return (
                            <Flex
                              key={file.name}
                              data-file-item
                              alignItems="center"
                              gap={2}
                              px={2}
                              py={1.5}
                              pl={4}
                              borderRadius="md"
                              cursor="pointer"
                              transition="all 100ms"
                              bg={
                                isActive
                                  ? "bg.active"
                                  : isQueued
                                    ? "accent.green/10"
                                    : "transparent"
                              }
                              borderLeft="2px solid"
                              borderLeftColor={
                                isActive
                                  ? "accent.blue"
                                  : isQueued
                                    ? "accent.green"
                                    : "transparent"
                              }
                              onClick={() => onOpenFile(sol.name, file.name)}
                              _hover={{ bg: isActive ? "bg.active" : "bg.hover" }}
                            >
                              <Box
                                w={5}
                                h={5}
                                borderRadius="sm"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                flexShrink={0}
                                bg={isActive ? "accent.blue/15" : isQueued ? "accent.green/15" : "bg.surface"}
                              >
                                <FileCode
                                  size={12}
                                  color={isActive ? "#3b82f6" : isQueued ? "#22c55e" : "#546478"}
                                />
                              </Box>
                              <Box flex={1} minW={0}>
                                <Text
                                  fontSize="xs"
                                  fontWeight="medium"
                                  truncate
                                  color={isActive ? "text.primary" : "text.secondary"}
                                >
                                  {file.name}
                                  <Box as="span" color="text.muted">
                                    .cs
                                  </Box>
                                </Text>
                              </Box>
                              <HStack gap={1} flexShrink={0}>
                                {isQueued && (
                                  <Box title="Queued for execution">
                                    <Play size={10} fill="#22c55e" color="#22c55e" />
                                  </Box>
                                )}
                                <IconButton
                                  aria-label="Delete file"
                                  size="2xs"
                                  variant="ghost"
                                  color="text.muted"
                                  _hover={{ color: "accent.red", bg: "accent.red/10" }}
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    onDeleteFile(sol.name, file.name);
                                  }}
                                >
                                  <Trash2 size={11} />
                                </IconButton>
                              </HStack>
                            </Flex>
                          );
                        })
                      )}
                    </Box>
                  )}
                </Box>
              );
            })}
          </VStack>
        )}
      </Box>

      {/* Footer */}
      <Flex
        alignItems="center"
        justifyContent="space-between"
        px={3}
        py={2.5}
        flexShrink={0}
        borderTop="1px solid"
        borderColor="border.subtle"
        bg="bg.panel"
      >
        <Text fontSize="2xs" color="text.muted">
          {solutions.length} solution{solutions.length !== 1 ? "s" : ""}
        </Text>
        <HStack gap={1}>
          <Kbd px={4} fontSize="2xs">Ctrl+N</Kbd>
          <Text fontSize="2xs" color="text.muted">
            new
          </Text>
        </HStack>
      </Flex>
    </Box>
  );
}
