import { useState, useEffect, useRef } from "react";
import { Box, Flex, Text, Input, Button, HStack } from "@chakra-ui/react";
import * as api from "../api";
import type { Settings } from "../api";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSettingsChanged: () => void;
}

export function SettingsModal({ open, onClose, onSettingsChanged }: SettingsModalProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [newPath, setNewPath] = useState("");
  const [mode, setMode] = useState<"new-only" | "all">("new-only");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(null);
      setMode("new-only");
      setLoading(true);
      api.getSettings().then((s) => {
        setSettings(s);
        setNewPath(s.storagePath);
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }).catch((e) => {
        setError(e.message);
        setLoading(false);
      });
    }
  }, [open]);

  const hasChanges = settings && newPath.trim() && newPath.trim() !== settings.storagePath;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === "new-only") {
        await api.updateSettings(newPath.trim());
        setSuccess("Storage path updated. New projects will be saved to the new location.");
      } else {
        const result = await api.migrateProjects(newPath.trim(), "all");
        setSuccess(
          `Migration complete. ${result.moved} collection(s) moved to the new location.`
        );
      }
      onSettingsChanged();
      // Refresh settings display
      const updated = await api.getSettings();
      setSettings(updated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
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
        maxW="md"
        borderRadius="xl"
        p={6}
        bg="bg.elevated"
        border="1px solid"
        borderColor="border.default"
        boxShadow="lg"
      >
        <Text fontSize="sm" fontWeight="bold" mb={4} color="text.primary">
          Project Storage Settings
        </Text>

        {loading && !settings ? (
          <Text fontSize="xs" color="text.muted">Loading...</Text>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Current path */}
            <Text
              fontSize="2xs"
              fontWeight="bold"
              textTransform="uppercase"
              letterSpacing="wider"
              display="block"
              mb={1.5}
              color="text.muted"
            >
              Current Location
            </Text>
            <Box
              px={3}
              py={2}
              mb={4}
              borderRadius="md"
              bg="bg.surface"
              border="1px solid"
              borderColor="border.subtle"
            >
              <Text fontSize="xs" fontFamily="mono" color="text.secondary">
                {settings?.storagePath || "..."}
              </Text>
            </Box>

            {/* New path input */}
            <Text
              fontSize="2xs"
              fontWeight="bold"
              textTransform="uppercase"
              letterSpacing="wider"
              display="block"
              mb={1.5}
              color="text.muted"
            >
              New Location
            </Text>
            <Input
              ref={inputRef}
              type="text"
              value={newPath}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPath(e.target.value)}
              placeholder="/path/to/your/projects"
              fontFamily="mono"
              size="sm"
              px={2}
              mb={4}
            />

            {/* Migration mode */}
            {hasChanges && (
              <>
                <Text
                  fontSize="2xs"
                  fontWeight="bold"
                  textTransform="uppercase"
                  letterSpacing="wider"
                  display="block"
                  mb={2}
                  color="text.muted"
                >
                  Migration
                </Text>
                <Flex direction="column" gap={2} mb={4}>
                  <HStack
                    gap={3}
                    px={3}
                    py={2.5}
                    borderRadius="md"
                    bg={mode === "new-only" ? "accent.blue/10" : "bg.surface"}
                    border="1px solid"
                    borderColor={mode === "new-only" ? "accent.blue" : "border.subtle"}
                    cursor="pointer"
                    onClick={() => setMode("new-only")}
                  >
                    <input
                      type="radio"
                      name="migration-mode"
                      checked={mode === "new-only"}
                      onChange={() => setMode("new-only")}
                    />
                    <Box>
                      <Text fontSize="xs" fontWeight="medium" color="text.primary">
                        New projects only
                      </Text>
                      <Text fontSize="2xs" color="text.muted">
                        Existing projects stay in the current location
                      </Text>
                    </Box>
                  </HStack>
                  <HStack
                    gap={3}
                    px={3}
                    py={2.5}
                    borderRadius="md"
                    bg={mode === "all" ? "accent.blue/10" : "bg.surface"}
                    border="1px solid"
                    borderColor={mode === "all" ? "accent.blue" : "border.subtle"}
                    cursor="pointer"
                    onClick={() => setMode("all")}
                  >
                    <input
                      type="radio"
                      name="migration-mode"
                      checked={mode === "all"}
                      onChange={() => setMode("all")}
                    />
                    <Box>
                      <Text fontSize="xs" fontWeight="medium" color="text.primary">
                        Migrate all projects
                      </Text>
                      <Text fontSize="2xs" color="text.muted">
                        Move all existing collections to the new location
                      </Text>
                    </Box>
                  </HStack>
                </Flex>
              </>
            )}

            {/* Docker warning */}
            <Box
              px={3}
              py={2.5}
              mb={4}
              borderRadius="md"
              bg="yellow.500/10"
              border="1px solid"
              borderColor="yellow.500/30"
            >
              <Text fontSize="2xs" color="yellow.400">
                If running in Docker, ensure the new path is mounted as a volume in{" "}
                <Text as="span" fontFamily="mono">docker-compose.yml</Text>.
              </Text>
            </Box>

            {/* Error/Success feedback */}
            {error && (
              <Box
                px={3}
                py={2.5}
                mb={4}
                borderRadius="md"
                bg="red.500/10"
                border="1px solid"
                borderColor="red.500/30"
              >
                <Text fontSize="2xs" color="red.400">{error}</Text>
              </Box>
            )}
            {success && (
              <Box
                px={3}
                py={2.5}
                mb={4}
                borderRadius="md"
                bg="green.500/10"
                border="1px solid"
                borderColor="green.500/30"
              >
                <Text fontSize="2xs" color="green.400">{success}</Text>
              </Box>
            )}

            {/* Actions */}
            <Flex justify="flex-end" gap={2} mt={5}>
              <Button size="sm" variant="outline" onClick={onClose} px={4}>
                Close
              </Button>
              <Button
                size="sm"
                type="submit"
                colorPalette="green"
                disabled={!hasChanges || loading}
                loading={loading}
                px={4}
              >
                {mode === "all" ? "Migrate" : "Save"}
              </Button>
            </Flex>
          </form>
        )}
      </Box>
    </Box>
  );
}
