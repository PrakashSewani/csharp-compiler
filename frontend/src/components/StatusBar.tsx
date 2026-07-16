import { Flex, Text } from "@chakra-ui/react";

interface StatusBarProps {
  currentFile: string | null;
  isSaving: boolean;
  lintErrorCount: number;
}

export function StatusBar({ currentFile, isSaving, lintErrorCount }: StatusBarProps) {
  return (
    <Flex
      alignItems="center"
      justifyContent="space-between"
      px={4}
      h={6}
      flexShrink={0}
      userSelect="none"
      bg="bg.elevated"
      borderTop="1px solid"
      borderColor="border.subtle"
    >
      <Flex alignItems="center" gap={3}>
        {currentFile ? (
          <Text fontSize="2xs" fontFamily="mono" color="text.secondary">
            {currentFile}.cs
          </Text>
        ) : (
          <Text fontSize="2xs" color="text.muted">
            No file open
          </Text>
        )}
      </Flex>

      <Flex alignItems="center" gap={3}>
        {isSaving && (
          <Text
            fontSize="2xs"
            color="text.muted"
            animation="pulse-glow 2s ease-in-out infinite"
          >
            Saving...
          </Text>
        )}
        {lintErrorCount > 0 && (
          <Text fontSize="2xs" color="accent.red">
            {lintErrorCount} problem{lintErrorCount !== 1 ? "s" : ""}
          </Text>
        )}
        <Text fontSize="2xs" color="text.muted">
          C#
        </Text>
        <Text fontSize="2xs" color="text.muted">
          UTF-8
        </Text>
      </Flex>
    </Flex>
  );
}
