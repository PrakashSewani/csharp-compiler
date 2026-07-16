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
  const decorationCollectionRef = useRef<editor.IEditorDecorationsCollection | null>(null);
  const hoverProviderRef = useRef<any>(null);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.editor.defineTheme("csharp-dark", CSHARP_THEME);
    monaco.editor.setTheme("csharp-dark");

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {});

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      window.dispatchEvent(new CustomEvent("run-code"));
    });

    hoverProviderRef.current = monaco.languages.registerHoverProvider("csharp", {
      provideHover(model, position) {
        const lineNumber = position.lineNumber;
        const lineErrors = errors.filter((e) => e.line === lineNumber);
        if (lineErrors.length === 0) return null;

        const contents = lineErrors.map((err) => ({
          value: `**${err.severity === "error" ? "Error" : "Warning"}**: ${err.message}`,
        }));

        return {
          range: new monaco.Range(lineNumber, 1, lineNumber, model.getLineMaxColumn(lineNumber)),
          contents,
        };
      },
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

    const decorations = errors.map((err) => ({
      range: new monaco.Range(err.line, 1, err.line, model.getLineMaxColumn(err.line)),
      options: {
        after: {
          content: `  \u2716 ${err.message}`,
          inlineClassName: err.severity === "error" ? "inline-error-decoration" : "inline-warning-decoration",
        },
        isWholeLine: true,
        className: err.severity === "error" ? "error-line-decoration" : "warning-line-decoration",
      },
    }));

    decorationCollectionRef.current?.clear();
    decorationCollectionRef.current = editor.createDecorationsCollection(decorations);
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

  useEffect(() => {
    return () => {
      hoverProviderRef.current?.dispose();
    };
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
      <style>{`
        .inline-error-decoration {
          color: #ef4444 !important;
          font-size: 11px !important;
          font-style: italic !important;
          margin-left: 16px !important;
        }
        .inline-warning-decoration {
          color: #facc15 !important;
          font-size: 11px !important;
          font-style: italic !important;
          margin-left: 16px !important;
        }
        .error-line-decoration {
          background: rgba(239, 68, 68, 0.06) !important;
        }
        .warning-line-decoration {
          background: rgba(250, 204, 21, 0.06) !important;
        }
      `}</style>
    </div>
  );
}
