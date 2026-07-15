import { Play, Plus, FlaskConical, Loader2, Code2, Sparkles } from "lucide-react";

interface HeaderProps {
  currentFile: string | null;
  isRunning: boolean;
  isSaving: boolean;
  onRun: () => void;
  onNewFile: () => void;
  onToggleTests: () => void;
  showTestCases: boolean;
}

export function Header({
  currentFile,
  isRunning,
  isSaving,
  onRun,
  onNewFile,
  onToggleTests,
  showTestCases,
}: HeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-5 h-14 shrink-0"
      style={{
        background: "linear-gradient(180deg, var(--bg-elevated) 0%, var(--bg-panel) 100%)",
        borderBottom: "1px solid var(--border-subtle)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
      }}
    >
      {/* Left: Logo + New File */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%)",
              boxShadow: "0 2px 8px rgba(76, 154, 255, 0.3)",
            }}
          >
            <Code2 size={16} color="#fff" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              C# Playground
            </span>
            <span
              className="text-[10px] ml-2 px-1.5 py-0.5 rounded-full font-medium"
              style={{
                background: "rgba(76, 154, 255, 0.15)",
                color: "var(--accent-blue)",
                border: "1px solid rgba(76, 154, 255, 0.2)",
              }}
            >
              DSA
            </span>
          </div>
        </div>

        <div className="h-6 w-px" style={{ background: "var(--border-default)" }} />

        <button
          onClick={onNewFile}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer"
          style={{
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-default)",
            boxShadow: "var(--shadow-sm)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-hover)";
            e.currentTarget.style.borderColor = "var(--border-strong)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg-surface)";
            e.currentTarget.style.borderColor = "var(--border-default)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <Plus size={14} />
          New File
        </button>
      </div>

      {/* Center: Current file indicator */}
      {currentFile && (
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <Sparkles size={12} style={{ color: "var(--accent-purple)" }} />
            <span
              className="text-xs font-semibold font-mono"
              style={{ color: "var(--accent-purple)" }}
            >
              {currentFile}.cs
            </span>
          </div>

          {isSaving && (
            <span
              className="text-[11px] animate-pulse-glow"
              style={{ color: "var(--text-muted)" }}
            >
              Saving...
            </span>
          )}
        </div>
      )}

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {currentFile && (
          <>
            <button
              onClick={onToggleTests}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer"
              style={{
                background: showTestCases
                  ? "rgba(76, 154, 255, 0.15)"
                  : "var(--bg-surface)",
                color: showTestCases ? "var(--accent-blue)" : "var(--text-secondary)",
                border: `1px solid ${showTestCases ? "rgba(76, 154, 255, 0.3)" : "var(--border-default)"}`,
              }}
              onMouseEnter={(e) => {
                if (!showTestCases) e.currentTarget.style.background = "var(--bg-hover)";
              }}
              onMouseLeave={(e) => {
                if (!showTestCases) e.currentTarget.style.background = "var(--bg-surface)";
              }}
            >
              <FlaskConical size={14} />
              Tests
            </button>

            <button
              onClick={onRun}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: isRunning
                  ? "var(--accent-blue)"
                  : "linear-gradient(135deg, var(--accent-green) 0%, #2ab874 100%)",
                color: "#fff",
                boxShadow: isRunning
                  ? "0 2px 12px rgba(76, 154, 255, 0.3)"
                  : "0 2px 12px rgba(61, 214, 140, 0.3)",
              }}
              onMouseEnter={(e) => {
                if (!isRunning) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(61, 214, 140, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = isRunning
                  ? "0 2px 12px rgba(76, 154, 255, 0.3)"
                  : "0 2px 12px rgba(61, 214, 140, 0.3)";
              }}
            >
              {isRunning ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play size={14} fill="currentColor" />
                  Run
                </>
              )}
            </button>
          </>
        )}
      </div>
    </header>
  );
}
