import { useState, useCallback, useRef, useEffect } from "react";
import { FileCode, Plus, Trash2, FolderOpen, Search } from "lucide-react";
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

interface FileExplorerProps {
  files: { name: string; updatedAt: string }[];
  currentFile: string | null;
  onOpen: (name: string) => void;
  onNew: () => void;
  onDelete: (name: string) => void;
}

export function FileExplorer({
  files,
  currentFile,
  onOpen,
  onNew,
  onDelete,
}: FileExplorerProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        onOpen(filtered[selectedIndex].name);
      } else if (e.key === "Delete" && selectedIndex >= 0) {
        e.preventDefault();
        onDelete(filtered[selectedIndex].name);
      }
    },
    [filtered, selectedIndex, onOpen, onDelete]
  );

  useEffect(() => {
    setSelectedIndex(-1);
  }, [search]);

  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-file-item]");
      items[selectedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  return (
    <Box
      h="100%"
      display="flex"
      flexDirection="column"
      overflow="hidden"
      bg="bg.panel"
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
          {files.length > 0 && (
            <Text
              fontSize="2xs"
              px={1.5}
              py={0.5}
              borderRadius="full"
              fontWeight="bold"
              bg="bg.hover"
              color="text.muted"
            >
              {files.length}
            </Text>
          )}
        </HStack>
        <IconButton
          aria-label="New file"
          size="xs"
          variant="outline"
          onClick={onNew}
        >
          <Plus size={13} />
        </IconButton>
      </Flex>

      {/* Search */}
      <Box px={3} pb={3} pt={2} flexShrink={0}>
        <InputGroup startElement={<Search size={12} color="#546478" />}>
          <Input
            size="sm"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fontFamily="mono"
          />
        </InputGroup>
      </Box>

      {/* File list */}
      <Box
        ref={listRef}
        flex={1}
        overflowY="auto"
        px={2}
        pb={2}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (selectedIndex < 0 && filtered.length > 0) setSelectedIndex(0);
        }}
      >
        {filtered.length === 0 ? (
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
            <Text
              fontSize="xs"
              textAlign="center"
              lineHeight="relaxed"
              color="text.muted"
            >
              {search ? "No matching files" : "No files yet"}
            </Text>
            {!search && (
              <Text
                as="button"
                fontSize="xs"
                fontWeight="medium"
                mt={2}
                color="accent.blue"
                onClick={onNew}
                _hover={{ textDecoration: "underline" }}
              >
                Create your first file
              </Text>
            )}
          </Flex>
        ) : (
          <VStack gap={1} align="stretch">
            {filtered.map((file, i) => {
              const isActive = currentFile === file.name;
              const isSelected = selectedIndex === i;

              return (
                <Flex
                  key={file.name}
                  data-file-item
                  alignItems="center"
                  gap={2.5}
                  px={2.5}
                  py={2}
                  borderRadius="md"
                  cursor="pointer"
                  transition="all 100ms"
                  bg={
                    isActive
                      ? "bg.active"
                      : isSelected
                        ? "bg.hover"
                        : "transparent"
                  }
                  borderLeft="2px solid"
                  borderLeftColor={isActive ? "accent.blue" : "transparent"}
                  pl={isActive ? 2 : 2.5}
                  onClick={() => onOpen(file.name)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  _hover={{ bg: isActive ? "bg.active" : "bg.hover" }}
                >
                  <Box
                    w={7}
                    h={7}
                    borderRadius="md"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    flexShrink={0}
                    bg={isActive ? "accent.blue/15" : "bg.surface"}
                  >
                    <FileCode
                      size={13}
                      color={isActive ? "#3b82f6" : "#546478"}
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
                      <Box as="span" color="text.muted">.cs</Box>
                    </Text>
                    <Text fontSize="2xs" color="text.muted">
                      {formatDate(file.updatedAt)}
                    </Text>
                  </Box>
                  <IconButton
                    aria-label="Delete"
                    size="xs"
                    variant="ghost"
                    color="text.muted"
                    opacity={0}
                    _groupHover={{ opacity: 1 }}
                    _hover={{ color: "accent.red", bg: "accent.red/10" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(file.name);
                    }}
                  >
                    <Trash2 size={11} />
                  </IconButton>
                </Flex>
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
          {files.length} file{files.length !== 1 ? "s" : ""}
        </Text>
        <HStack gap={1}>
          <Kbd fontSize="2xs">Ctrl+N</Kbd>
          <Text fontSize="2xs" color="text.muted">new</Text>
        </HStack>
      </Flex>
    </Box>
  );
}
