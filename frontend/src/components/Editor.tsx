import { useRef, useEffect } from "react";
import MonacoEditor, { OnMount, OnChange } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import type { LintError } from "../api";

interface EditorProps {
  code: string;
  onChange: (code: string) => void;
  errors: LintError[];
}

const CSHARP_THEME: editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "556b7e", fontStyle: "italic" },
    { token: "keyword", foreground: "569cd6" },
    { token: "keyword.control", foreground: "c586c0" },
    { token: "string", foreground: "ce9178" },
    { token: "string.escape", foreground: "d7ba7d" },
    { token: "number", foreground: "b5cea8" },
    { token: "number.hex", foreground: "b5cea8" },
    { token: "type", foreground: "4ec9b0" },
    { token: "class", foreground: "4ec9b0" },
    { token: "struct", foreground: "4ec9b0" },
    { token: "interface", foreground: "b8d7a3" },
    { token: "enum", foreground: "4ec9b0" },
    { token: "delegate", foreground: "4ec9b0" },
    { token: "namespace", foreground: "4ec9b0" },
    { token: "function", foreground: "dcdcaa" },
    { token: "method", foreground: "dcdcaa" },
    { token: "variable", foreground: "9cdcfe" },
    { token: "parameter", foreground: "9cdcfe" },
    { token: "field", foreground: "9cdcfe" },
    { token: "property", foreground: "9cdcfe" },
    { token: "operator", foreground: "d4d4d4" },
    { token: "delimiter", foreground: "d4d4d4" },
    { token: "predefined", foreground: "4fc1ff" },
    { token: "xmlDocCommentName", foreground: "556b7e" },
    { token: "xmlDocCommentDelimiter", foreground: "556b7e" },
    { token: "xmlDocCommentAttribute", foreground: "556b7e" },
  ],
  colors: {
    "editor.background": "#0a0e14",
    "editor.foreground": "#e8edf4",
    "editor.lineHighlightBackground": "#151a21",
    "editor.lineHighlightBorder": "#00000000",
    "editor.selectionBackground": "#264f78",
    "editor.inactiveSelectionBackground": "#264f7855",
    "editorLineNumber.foreground": "#3a4556",
    "editorLineNumber.activeForeground": "#8b97a8",
    "editorCursor.foreground": "#6cb4ff",
    "editor.findMatchBackground": "#9e6a03aa",
    "editor.findMatchHighlightBackground": "#f2cc6044",
    "editorBracketMatch.background": "#3b5571aa",
    "editorBracketMatch.border": "#6cb4ff",
    "editorGutter.background": "#0a0e14",
    "editorWidget.background": "#151a21",
    "editorWidget.border": "#2a3140",
    "editorSuggestWidget.background": "#151a21",
    "editorSuggestWidget.border": "#2a3140",
    "editorSuggestWidget.selectedBackground": "#1e2530",
    "editorSuggestWidget.highlightForeground": "#6cb4ff",
    "editorHoverWidget.background": "#151a21",
    "editorHoverWidget.border": "#2a3140",
    "minimap.background": "#0a0e14",
    "minimap.selectionHighlight": "#264f78",
    "scrollbar.shadow": "#00000000",
    "scrollbarSlider.background": "#2a314088",
    "scrollbarSlider.hoverBackground": "#2a3140cc",
    "scrollbarSlider.activeBackground": "#2a3140ee",
    "editorIndentGuide.background": "#1e2530",
    "editorIndentGuide.activeBackground": "#2a3140",
    "editorBracketHighlight.foreground1": "#6cb4ff",
    "editorBracketHighlight.foreground2": "#a78bfa",
    "editorBracketHighlight.foreground3": "#3dd68c",
    "editorBracketHighlight.foreground4": "#f0b44c",
    "editorBracketHighlight.foreground5": "#f06b6b",
    "editorBracketHighlight.foreground6": "#22d3ee",
    "editorOverviewRuler.border": "#00000000",
    "editorOverviewRuler.errorForeground": "#f06b6b55",
    "editorOverviewRuler.warningForeground": "#f0b44c55",
  },
};

export function Editor({ code, onChange, errors }: EditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.editor.defineTheme("csharp-dark", CSHARP_THEME);
    monaco.editor.setTheme("csharp-dark");

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {});

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      window.dispatchEvent(new CustomEvent("run-code"));
    });

    editor.focus();
  };

  const handleChange: OnChange = (value) => {
    onChange(value || "");
  };

  useEffect(() => {
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    if (!monaco || !editor) return;

    const model = editor.getModel();
    if (!model) return;

    const markers = errors.map((err) => ({
      severity:
        err.severity === "error"
          ? monaco.MarkerSeverity.Error
          : monaco.MarkerSeverity.Warning,
      message: err.message,
      startLineNumber: err.line,
      startColumn: err.column,
      endLineNumber: err.line,
      endColumn: err.column + 10,
    }));

    monaco.editor.setModelMarkers(model, "csharp-lint", markers);
  }, [errors]);

  useEffect(() => {
    const handler = () => {};
    window.addEventListener("run-code", handler);
    return () => window.removeEventListener("run-code", handler);
  }, []);

  return (
    <div className="h-full w-full" style={{ background: "var(--bg-app)" }}>
      <MonacoEditor
        height="100%"
        defaultLanguage="csharp"
        theme="csharp-dark"
        value={code}
        onChange={handleChange}
        onMount={handleMount}
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          fontLigatures: true,
          minimap: {
            enabled: true,
            scale: 1,
            showSlider: "mouseover",
            renderCharacters: false,
          },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          automaticLayout: true,
          tabSize: 4,
          insertSpaces: true,
          renderWhitespace: "selection",
          bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: true },
          guides: {
            bracketPairs: true,
            indentation: true,
            highlightActiveIndentation: true,
          },
          suggest: {
            showKeywords: true,
            showSnippets: true,
            showClasses: true,
            showFunctions: true,
            showVariables: true,
            showInterfaces: true,
            showStructs: true,
            showEnums: true,
          },
          quickSuggestions: true,
          parameterHints: { enabled: true },
          autoClosingBrackets: "always",
          autoClosingQuotes: "always",
          autoIndent: "full",
          formatOnPaste: true,
          formatOnType: true,
          smoothScrolling: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          padding: { top: 16, bottom: 16 },
          lineHeight: 24,
          letterSpacing: 0.3,
          renderLineHighlight: "all",
          renderLineHighlightOnlyWhenFocus: false,
          occurrencesHighlight: "singleFile",
          selectionHighlight: true,
          folding: true,
          foldingStrategy: "indentation",
          showFoldingControls: "mouseover",
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          scrollbar: {
            verticalSliderSize: 6,
            horizontalSliderSize: 6,
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
          lineDecorationsWidth: 8,
          lineNumbersMinChars: 4,
        }}
      />
    </div>
  );
}
