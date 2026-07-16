import { Play, Plus, FlaskConical, Loader2, Code2, PanelLeft } from "lucide-react";
import { Box, Flex, HStack, Button, IconButton, Badge, Text, Kbd } from "@chakra-ui/react";

interface HeaderProps {
  currentFile: string | null;
  isRunning: boolean;
  isSaving: boolean;
  onRun: () => void;
  onNewFile: () => void;
  onToggleTests: () => void;
  showTestCases: boolean;
  showSidebar: boolean;
  onToggleSidebar: () => void;
}

export function Header({
  currentFile,
  isRunning,
  isSaving,
  onRun,
  onNewFile,
  onToggleTests,
  showTestCases,
  showSidebar,
  onToggleSidebar,
}: HeaderProps) {
  return (
    <Box
      as="header"
      px={5}
      h={14}
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      flexShrink={0}
      bg="bg.elevated"
      borderBottom="1px solid"
      borderColor="border.subtle"
    >
      {/* Left: Logo + Actions */}
      <HStack gap={4}>
        <HStack gap={2.5}>
          <Box
            w={8}
            h={8}
            borderRadius="lg"
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg="accent.blue"
            color="white"
          >
            <Code2 size={16} />
          </Box>
          <HStack gap={2}>
            <Text
              fontSize="sm"
              fontWeight="bold"
              letterSpacing="tight"
              color="text.primary"
            >
              C# Playground
            </Text>
            <Badge
              size="sm"
              variant="subtle"
              colorPalette="blue"
              fontSize="9px"
              fontWeight="bold"
              textTransform="uppercase"
              letterSpacing="widest"
            >
              DSA
            </Badge>
          </HStack>
        </HStack>

        <Box w="px" h={5} bg="border.default" />

        <IconButton
          aria-label="Toggle sidebar"
          size="sm"
          variant={showSidebar ? "subtle" : "ghost"}
          colorPalette={showSidebar ? "blue" : "gray"}
          onClick={onToggleSidebar}
        >
          <PanelLeft size={14} />
        </IconButton>

        <Button
          size="sm"
          variant="subtle"
          colorPalette="blue"
          onClick={onNewFile}
        >
          <Plus size={14} />
          New
        </Button>
      </HStack>

      {/* Center: Current file indicator */}
      {currentFile && (
        <HStack gap={2}>
          <HStack
            gap={2}
            px={3}
            py={1.5}
            borderRadius="md"
            bg="bg.surface"
            border="1px solid"
            borderColor="border.subtle"
          >
            <Box w={2} h={2} borderRadius="full" bg="accent.blue" />
            <Text fontSize="xs" fontFamily="mono" fontWeight="medium" color="text.primary">
              {currentFile}.cs
            </Text>
          </HStack>

          {isSaving && (
            <Text
              fontSize="2xs"
              color="text.muted"
              animation="pulse-glow 2s ease-in-out infinite"
            >
              Saving...
            </Text>
          )}
        </HStack>
      )}

      {/* Right: Actions */}
      <HStack gap={2.5}>
        {currentFile && (
          <>
            <Button
              size="sm"
              variant={showTestCases ? "subtle" : "outline"}
              colorPalette={showTestCases ? "blue" : "gray"}
              onClick={onToggleTests}
            >
              <FlaskConical size={14} />
              Tests
            </Button>

            <Button
              size="sm"
              variant="solid"
              colorPalette="green"
              onClick={onRun}
              loading={isRunning}
              loadingText="Running..."
            >
              {!isRunning && <Play size={14} fill="currentColor" />}
              Run
            </Button>

            <Kbd fontSize="2xs" display={{ base: "none", lg: "inline-flex" }}>
              Ctrl+Enter
            </Kbd>
          </>
        )}
      </HStack>
    </Box>
  );
}
