import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import {
  Search,
  Play,
  Plus,
  FileCode,
  FlaskConical,
  PanelLeft,
  Save,
  FolderPlus,
  Folder,
} from "lucide-react";
import { Box, Flex, HStack, Text, Kbd } from "@chakra-ui/react";
import type { SolutionFolder } from "../api";

interface Command {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  solutions: SolutionFolder[];
  currentSolution: string | null;
  currentFile: string | null;
  onOpenFile: (solution: string, file: string) => void;
  onNewSolution: () => void;
  onNewFile: () => void;
  onRun: () => void;
  onToggleTests: () => void;
  onToggleSidebar: () => void;
  onSave: () => void;
}

export function CommandPalette({
  open,
  onClose,
  solutions,
  currentSolution,
  currentFile,
  onOpenFile,
  onNewSolution,
  onNewFile,
  onRun,
  onToggleTests,
  onToggleSidebar,
  onSave,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = [
    { id: "run", label: "Run Code", icon: <Play size={14} />, shortcut: "Ctrl+Enter", action: () => { onRun(); onClose(); } },
    { id: "new-solution", label: "New Solution", icon: <FolderPlus size={14} />, shortcut: "Ctrl+N", action: () => { onNewSolution(); onClose(); } },
    { id: "new-file", label: "New File", icon: <Plus size={14} />, action: () => { onNewFile(); onClose(); } },
    { id: "save", label: "Save File", icon: <Save size={14} />, shortcut: "Ctrl+S", action: () => { onSave(); onClose(); } },
    { id: "toggle-tests", label: "Toggle Test Panel", icon: <FlaskConical size={14} />, shortcut: "Ctrl+Shift+T", action: () => { onToggleTests(); onClose(); } },
    { id: "toggle-sidebar", label: "Toggle Sidebar", icon: <PanelLeft size={14} />, shortcut: "Ctrl+B", action: () => { onToggleSidebar(); onClose(); } },
  ];

  const fileCommands: Command[] = solutions.flatMap((sol) =>
    sol.files.map((f) => ({
      id: `file-${sol.name}-${f.name}`,
      label: `${sol.name} / ${f.name}`,
      icon: <FileCode size={14} />,
      action: () => { onOpenFile(sol.name, f.name); onClose(); },
    }))
  );

  const allCommands = [...commands, ...fileCommands];

  const filtered = allCommands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const executeCommand = useCallback(
    (index: number) => {
      if (filtered[index]) {
        filtered[index].action();
      }
    },
    [filtered]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      executeCommand(selectedIndex);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center pt-[15vh] px-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-150"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-100"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel
                className="w-full max-w-lg rounded-xl overflow-hidden"
                style={{
                  background: "#131924",
                  border: "1px solid #1f2937",
                  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.6), 0 4px 6px -4px rgba(0,0,0,0.5)",
                }}
              >
                {/* Search input */}
                <Flex
                  alignItems="center"
                  gap={3}
                  px={4}
                  h={12}
                  borderBottom="1px solid"
                  borderColor="border.subtle"
                >
                  <Search size={15} color="#546478" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a command or search files..."
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: "#f0f4f8" }}
                  />
                  <Kbd fontSize="2xs">ESC</Kbd>
                </Flex>

                {/* Command list */}
                <Box maxH={64} overflowY="auto" py={1.5}>
                  {filtered.length === 0 ? (
                    <Flex px={4} py={6} justify="center">
                      <Text fontSize="xs" color="text.muted">
                        No matching commands
                      </Text>
                    </Flex>
                  ) : (
                    filtered.map((cmd, i) => (
                      <Flex
                        key={cmd.id}
                        alignItems="center"
                        gap={3}
                        px={4}
                        py={2.5}
                        cursor="pointer"
                        transition="all 100ms"
                        bg={i === selectedIndex ? "bg.hover" : "transparent"}
                        _hover={{ bg: "bg.hover" }}
                        onClick={() => executeCommand(i)}
                        onMouseEnter={() => setSelectedIndex(i)}
                      >
                        <Box color="text.muted">{cmd.icon}</Box>
                        <Text fontSize="xs" fontWeight="medium" flex={1} color="text.primary">
                          {cmd.label}
                        </Text>
                        {cmd.shortcut && <Kbd fontSize="2xs">{cmd.shortcut}</Kbd>}
                      </Flex>
                    ))
                  )}
                </Box>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
