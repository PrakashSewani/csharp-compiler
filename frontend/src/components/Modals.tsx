import { useState, useEffect, useRef } from "react";
import { Box, Flex, Text, Input, Button } from "@chakra-ui/react";
import type { ExecutionMode, LanguageCapability, LanguageId } from "../api";

interface ModalProps {
  open: boolean;
  onClose: () => void;
}

interface ConfirmDeleteModalProps extends ModalProps {
  kind: "collection" | "problem";
  name: string;
  collectionName?: string;
  loading?: boolean;
  error?: string;
  onConfirm: () => void;
}

export function ConfirmDeleteModal({
  open,
  onClose,
  kind,
  name,
  collectionName,
  loading = false,
  error,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => cancelRef.current?.focus(), 50);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [loading, onClose, open]);

  if (!open) return null;

  const isCollection = kind === "collection";

  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={60}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={4}
      bg="black/55"
      role="presentation"
      onClick={(event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
    >
      <Box
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        w="full"
        maxW="sm"
        borderRadius="xl"
        p={6}
        bg="bg.elevated"
        border="1px solid"
        borderColor="red.500/40"
        boxShadow="lg"
      >
        <Text id="delete-dialog-title" fontSize="sm" fontWeight="bold" color="text.primary">
          Delete {isCollection ? "collection" : "problem"}?
        </Text>
        <Text id="delete-dialog-description" mt={2} fontSize="xs" lineHeight="1.7" color="text.muted">
          {isCollection
            ? <>This permanently deletes <Box as="span" fontWeight="700" color="text.primary">{name}</Box> and every problem inside it.</>
            : <>This permanently deletes <Box as="span" fontWeight="700" color="text.primary">{name}</Box>{collectionName ? ` from ${collectionName}` : ""}.</>}
          {" "}This action cannot be undone.
        </Text>
        {error && (
          <Box mt={4} px={3} py={2.5} borderRadius="md" bg="red.500/10" border="1px solid" borderColor="red.500/30">
            <Text fontSize="xs" color="accent.red">{error}</Text>
          </Box>
        )}
        <Flex justify="flex-end" gap={2} mt={6}>
          <Button ref={cancelRef} size="sm" variant="outline" onClick={onClose} disabled={loading} px={4}>
            Cancel
          </Button>
          <Button
            size="sm"
            colorPalette="red"
            onClick={onConfirm}
            loading={loading}
            loadingText="Deleting"
            px={4}
          >
            Delete permanently
          </Button>
        </Flex>
      </Box>
    </Box>
  );
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
          New Collection
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
            Collection Name
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

export interface NewProblemValues {
  name: string;
  languageId: LanguageId;
  runtimeId: string;
  executionMode: ExecutionMode;
  useStarter: boolean;
}

export function NewProblemModal({
  open,
  onClose,
  onSubmit,
  solutionName,
  languages,
}: ModalProps & { onSubmit: (values: NewProblemValues) => void; solutionName: string | null; languages: LanguageCapability[] }) {
  const [name, setName] = useState("");
  const [languageId, setLanguageId] = useState<LanguageId>("csharp");
  const [runtimeId, setRuntimeId] = useState("");
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("stdin");
  const [useStarter, setUseStarter] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      const language = languages.find((item) => item.available) || languages[0];
      const runtime = language?.runtimes.find((item) => item.available && item.isDefault) || language?.runtimes.find((item) => item.available);
      if (language) setLanguageId(language.id);
      setRuntimeId(runtime?.id || "");
      setExecutionMode("stdin");
      setUseStarter(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [languages, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, languageId, runtimeId, executionMode, useStarter });
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
        maxW="lg"
        borderRadius="xl"
        p={6}
        bg="bg.elevated"
        border="1px solid"
        borderColor="border.default"
        boxShadow="lg"
      >
        <Text fontSize="sm" fontWeight="bold" mb={1} color="text.primary">
          New Problem
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
            Problem Name
          </Text>
          <Input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            placeholder="e.g. Two Sum, Merge Sort"
            fontFamily="mono"
            size="sm"
            px={2}
          />
          <Flex gap={3} mt={4} direction={{ base: "column", sm: "row" }}>
            <FieldSelect label="Language" value={languageId} onChange={(value) => {
              const nextLanguage = value as LanguageId;
              const capability = languages.find((item) => item.id === nextLanguage);
              const runtime = capability?.runtimes.find((item) => item.available && item.isDefault) || capability?.runtimes.find((item) => item.available);
              setLanguageId(nextLanguage);
              setRuntimeId(runtime?.id || "");
            }}>
              {languages.map((language) => <option key={language.id} value={language.id} disabled={!language.available}>{language.label}{language.available ? "" : " (unavailable)"}</option>)}
            </FieldSelect>
            <FieldSelect label="Runtime" value={runtimeId} onChange={setRuntimeId}>
              {(languages.find((item) => item.id === languageId)?.runtimes || []).map((runtime) => <option key={runtime.id} value={runtime.id} disabled={!runtime.available}>{runtime.label}{runtime.available ? "" : " (unavailable)"}</option>)}
            </FieldSelect>
          </Flex>
          <Flex gap={3} mt={4} direction={{ base: "column", sm: "row" }}>
            <FieldSelect label="Execution Mode" value={executionMode} onChange={(value) => setExecutionMode(value as ExecutionMode)}>
              <option value="stdin">Standard input</option>
              <option value="tests">Test cases</option>
            </FieldSelect>
            <Box flex={1}>
              <Text fontSize="2xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" mb={1.5} color="text.muted">Starter</Text>
              <Button type="button" size="sm" variant={useStarter ? "subtle" : "outline"} w="full" onClick={() => setUseStarter((value) => !value)}>
                {useStarter ? "Starter template" : "Blank document"}
              </Button>
            </Box>
          </Flex>
          <Flex justify="flex-end" gap={2} mt={5}>
            <Button size="sm" variant="outline" onClick={onClose} px={4}>
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              colorPalette="green"
              disabled={!name.trim() || !runtimeId}
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

function FieldSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <Box flex={1}>
      <Text fontSize="2xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" mb={1.5} color="text.muted">{label}</Text>
      <select className="ide-select" value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </Box>
  );
}
