import {
  Braces,
  FlaskConical,
  Moon,
  PanelLeft,
  Play,
  Settings,
  Sun,
  TerminalSquare,
} from "lucide-react";
import { Box, Flex, HStack, Button, IconButton, Text } from "@chakra-ui/react";
import { useTheme } from "next-themes";

interface HeaderProps {
  currentSolution: string | null;
  currentFile: string | null;
  isRunning: boolean;
  onRun: () => void;
  onToggleTests: () => void;
  showTestCases: boolean;
  showSidebar: boolean;
  onToggleSidebar: () => void;
  showOutput: boolean;
  onToggleOutput: () => void;
  onOpenSettings: () => void;
  testSummary?: { passed: number; total: number };
}

export function Header({
  currentSolution,
  currentFile,
  isRunning,
  onRun,
  onToggleTests,
  showTestCases,
  showSidebar,
  onToggleSidebar,
  showOutput,
  onToggleOutput,
  onOpenSettings,
  testSummary,
}: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const hasFile = Boolean(currentSolution && currentFile);

  return (
    <Flex
      as="header"
      px={{ base: 4, md: 5 }}
      h="68px"
      alignItems="center"
      justifyContent="space-between"
      gap={5}
      flexShrink={0}
      bg="bg.panel"
      borderBottom="1px solid"
      borderColor="border.subtle"
    >
      <HStack gap={3} minW={0}>
        <HStack gap={3} minW={0}>
          <Box
            w={9}
            h={9}
            borderRadius="md"
            display={{ base: "none", sm: "flex" }}
            alignItems="center"
            justifyContent="center"
            bg="bg.elevated"
            color="text.accent"
            border="1px solid"
            borderColor="border.default"
          >
            <Braces size={18} />
          </Box>
          <Box minW={0}>
            <Text fontSize="sm" fontWeight="700" letterSpacing="-0.02em" color="text.primary">
              Algorithm Desk
            </Text>
            <Text
              fontSize="xs"
              color="text.muted"
              truncate
              display={{ base: "none", sm: "block" }}
            >
              {hasFile ? `${currentSolution} / ${currentFile}` : "C# practice workspace"}
            </Text>
          </Box>
        </HStack>

        <IconButton
          aria-label={showSidebar ? "Hide practice library" : "Show practice library"}
          title={showSidebar ? "Hide library" : "Show library"}
          size="md"
          variant={showSidebar ? "subtle" : "ghost"}
          colorPalette={showSidebar ? "blue" : "gray"}
          onClick={onToggleSidebar}
        >
          <PanelLeft size={18} />
        </IconButton>
      </HStack>

      <HStack gap={3} flexShrink={0}>
        {testSummary && (
          <HStack
            gap={2}
            px={3.5}
            h={9}
            borderRadius="md"
            bg={testSummary.passed === testSummary.total ? "#14251b" : "#282311"}
            color={testSummary.passed === testSummary.total ? "accent.green" : "accent.yellow"}
            display={{ base: "none", md: "flex" }}
          >
            <Box w={1.5} h={1.5} borderRadius="full" bg="currentColor" />
            <Text fontSize="xs" fontWeight="700" fontFamily="mono">
              {testSummary.passed}/{testSummary.total} passed
            </Text>
          </HStack>
        )}

        {hasFile && (
          <Button
            size="md"
            variant={showTestCases ? "subtle" : "ghost"}
            colorPalette={showTestCases ? "blue" : "gray"}
            onClick={onToggleTests}
            px={{ base: 3, md: 4 }}
          >
            <FlaskConical size={16} />
            <Text display={{ base: "none", md: "inline" }}>Cases</Text>
          </Button>
        )}

        <IconButton
          aria-label={showOutput ? "Hide console" : "Show console"}
          title={showOutput ? "Hide console" : "Show console"}
          size="md"
          variant={showOutput ? "subtle" : "ghost"}
          colorPalette={showOutput ? "blue" : "gray"}
          onClick={onToggleOutput}
        >
          <TerminalSquare size={17} />
        </IconButton>

        <IconButton
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          size="md"
          variant="ghost"
          display={{ base: "none", md: "inline-flex" }}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </IconButton>

        <IconButton aria-label="Open settings" size="md" variant="ghost" onClick={onOpenSettings}>
          <Settings size={17} />
        </IconButton>

        <Button
          size="md"
          colorPalette="blue"
          onClick={onRun}
          loading={isRunning}
          loadingText="Running"
          disabled={!hasFile}
          minW={{ base: "46px", md: "108px" }}
          px={{ base: 3, md: 5 }}
          boxShadow={hasFile ? "0 8px 24px rgba(59, 130, 246, 0.14)" : "none"}
        >
          {!isRunning && <Play size={16} fill="currentColor" />}
          <Text display={{ base: "none", md: "inline" }}>Run</Text>
        </Button>
      </HStack>
    </Flex>
  );
}
