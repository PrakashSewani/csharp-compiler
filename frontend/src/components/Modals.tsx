import { useState, useEffect, useRef } from "react";
import { Box, Flex, Text, Input, Button } from "@chakra-ui/react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
}

export function NewSolutionModal({ open, onClose, onSubmit }: ModalProps & { onSubmit: (name: string) => void }) {
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
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
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
          New Solution
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
            Solution Name
          </Text>
          <Input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            placeholder="e.g. LeetCodeProblems, GraphAlgorithms"
            fontFamily="mono"
            size="sm"
            px={2}
          />
          <Flex justify="flex-end" gap={2} mt={5}>
            <Button size="sm" variant="outline" onClick={onClose} px={4}>
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              colorPalette="green"
              disabled={!name.trim()}
              px={4}
            >
              Create
            </Button>
          </Flex>
        </form>
      </Box>
    </Box>
  );
}

export function NewFileModal({
  open,
  onClose,
  onSubmit,
  solutionName,
}: ModalProps & { onSubmit: (name: string) => void; solutionName: string | null }) {
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
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
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
        <Text fontSize="sm" fontWeight="bold" mb={1} color="text.primary">
          New File
        </Text>
        {solutionName && (
          <Text fontSize="xs" color="text.muted" mb={4}>
            in {solutionName}
          </Text>
        )}
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            placeholder="e.g. TwoSum, MergeSort"
            fontFamily="mono"
            size="sm"
            px={2}
          />
          <Flex justify="flex-end" gap={2} mt={5}>
            <Button size="sm" variant="outline" onClick={onClose} px={4}>
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              colorPalette="green"
              disabled={!name.trim()}
              px={4}
            >
              Create
            </Button>
          </Flex>
        </form>
      </Box>
    </Box>
  );
}
