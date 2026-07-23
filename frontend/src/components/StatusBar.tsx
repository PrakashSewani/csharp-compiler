import { CircleAlert, Cloud, FlaskConical } from "lucide-react";
import { Flex, HStack, Text } from "@chakra-ui/react";

interface StatusBarProps {
  isSaving: boolean;
  errorCount: number;
  testCount: number;
  languageLabel: string;
  runtimeLabel: string;
  saveError?: string;
}

export function StatusBar({ isSaving, errorCount, testCount, languageLabel, runtimeLabel, saveError }: StatusBarProps) {
  return (
    <Flex
      alignItems="center"
      justifyContent="space-between"
      px={5}
      h={8}
      flexShrink={0}
      userSelect="none"
      bg="bg.panel"
      borderTop="1px solid"
      borderColor="border.subtle"
      aria-live="polite"
    >
      <HStack gap={2.5} color={saveError ? "accent.red" : isSaving ? "accent.yellow" : "text.muted"}>
        <Cloud size={12} />
        <Text fontSize="xs">{saveError ? "Save failed" : isSaving ? "Saving changes" : "All changes saved"}</Text>
      </HStack>

      <HStack gap={6}>
        <Text fontSize="xs" color="text.muted" display={{ base: "none", md: "block" }}>{languageLabel} / {runtimeLabel}</Text>
        <HStack gap={2} color={errorCount > 0 ? "accent.red" : "text.muted"}>
          <CircleAlert size={12} />
          <Text fontSize="xs">{errorCount} problem{errorCount === 1 ? "" : "s"}</Text>
        </HStack>
        <HStack gap={2} color="text.muted" display={{ base: "none", sm: "flex" }}>
          <FlaskConical size={12} />
          <Text fontSize="xs">{testCount} case{testCount === 1 ? "" : "s"}</Text>
        </HStack>
      </HStack>
    </Flex>
  );
}
