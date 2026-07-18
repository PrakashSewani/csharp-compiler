import { useRef, useEffect, useState } from "react";
import MonacoEditor, { OnMount, OnChange } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import type { LintError } from "../api";
import { CSHARP_THEME, EDITOR_OPTIONS } from "../monacoConfig";

interface EditorProps {
  code: string;
  onChange: (code: string) => void;
  errors: LintError[];
}

export function Editor({ code, onChange, errors }: EditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
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
    setIsLoading(false);
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

    const lineCount = model.getLineCount();

    try {
      const validErrors = errors.filter(
        (err) => err.line >= 1 && err.line <= lineCount
      );

      const markers = validErrors.map((err) => ({
        severity:
          err.severity === "error"
            ? monaco.MarkerSeverity.Error
            : monaco.MarkerSeverity.Warning,
        message: err.message,
        startLineNumber: err.line,
        startColumn: Math.min(err.column, model.getLineMaxColumn(err.line)),
        endLineNumber: err.line,
        endColumn: Math.min(err.column + 10, model.getLineMaxColumn(err.line)),
      }));

      monaco.editor.setModelMarkers(model, "csharp-lint", markers);
    } catch {
      monaco.editor.setModelMarkers(model, "csharp-lint", []);
    }
  }, [errors]);

  useEffect(() => {
    const handleNavigate = (e: CustomEvent) => {
      const editor = editorRef.current;
      if (!editor) return;
      const { line } = e.detail;
      if (typeof line === "number") {
        editor.revealLineInCenter(line);
        editor.setPosition({ lineNumber: line, column: 1 });
        editor.focus();
      }
    };

    window.addEventListener("navigate-to-line", handleNavigate as EventListener);
    return () => window.removeEventListener("navigate-to-line", handleNavigate as EventListener);
  }, []);

  return (
    <div className="h-full w-full relative" style={{ background: "#070a0e" }}>
      {isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10"
          style={{ background: "#070a0e" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 border-2 rounded-full animate-spin"
              style={{ borderColor: "#1f2937", borderTopColor: "#3b82f6" }}
            />
            <span className="text-xs" style={{ color: "#546478" }}>
              Loading editor...
            </span>
          </div>
        </div>
      )}
      <MonacoEditor
        height="100%"
        defaultLanguage="csharp"
        theme="csharp-dark"
        value={code}
        onChange={handleChange}
        onMount={handleMount}
        options={EDITOR_OPTIONS}
      />

    </div>
  );
}
