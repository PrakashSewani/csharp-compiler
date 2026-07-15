import { useState } from "react";
import {
  Terminal,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Keyboard,
  Copy,
  Check,
} from "lucide-react";
import type { ExecutionResult } from "../api";

interface OutputPanelProps {
  output: ExecutionResult | null;
  isRunning: boolean;
  stdin: string;
  onStdinChange: (stdin: string) => void;
}

export function OutputPanel({
  output,
  isRunning,
  stdin,
  onStdinChange,
}: OutputPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<"output" | "stdin">("output");
  const [copied, setCopied] = useState(false);
  const height = expanded ? "260px" : "40px";

  const getStatusIcon = () => {
    if (isRunning)
      return <Loader2 size={13} className="animate-spin" style={{ color: "var(--accent-blue)" }} />;
    if (!output) return null;
    if (output.timedOut)
      return <Clock size={13} style={{ color: "var(--accent-yellow)" }} />;
    if (output.compileErrors)
      return <XCircle size={13} style={{ color: "var(--accent-red)" }} />;
    if (output.exitCode !== 0)
      return <XCircle size={13} style={{ color: "var(--accent-red)" }} />;
    if (output.testResults && output.testResults.passed < output.testResults.total)
      return <AlertTriangle size={13} style={{ color: "var(--accent-yellow)" }} />;
    return <CheckCircle2 size={13} style={{ color: "var(--accent-green)" }} />;
  };

  const getStatusText = () => {
    if (isRunning) return "Compiling & Running...";
    if (!output) return "Ready";
    if (output.timedOut) return "Timed Out (30s)";
    if (output.compileErrors) return "Compilation Failed";
    if (output.exitCode !== 0) return `Runtime Error (exit ${output.exitCode})`;
    if (output.testResults) {
      const { passed, total } = output.testResults;
      return `${passed}/${total} Tests Passed`;
    }
    return "Success";
  };

  const getStatusColor = () => {
    if (isRunning) return "var(--accent-blue)";
    if (!output) return "var(--text-muted)";
    if (output.timedOut) return "var(--accent-yellow)";
    if (output.compileErrors || output.exitCode !== 0) return "var(--accent-red)";
    if (output.testResults && output.testResults.passed < output.testResults.total)
      return "var(--accent-yellow)";
    return "var(--accent-green)";
  };

  const getStatusBg = () => {
    if (isRunning) return "rgba(76, 154, 255, 0.1)";
    if (!output) return "transparent";
    if (output.timedOut || (output.testResults && output.testResults.passed < output.testResults.total))
      return "rgba(240, 180, 76, 0.1)";
    if (output.compileErrors || output.exitCode !== 0) return "rgba(240, 107, 107, 0.1)";
    if (output.testResults && output.testResults.passed === output.testResults.total)
      return "rgba(61, 214, 140, 0.1)";
    return "rgba(61, 214, 140, 0.1)";
  };

  const getFullOutput = () => {
    if (!output) return "";
    const parts: string[] = [];
    if (output.compileErrors) parts.push(output.compileErrors);
    if (output.stderr && !output.compileErrors) parts.push(output.stderr);
    if (output.stdout) parts.push(output.stdout);
    return parts.join("\n");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getFullOutput());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="shrink-0 flex flex-col transition-all duration-200"
      style={{
        height,
        background: "var(--bg-panel)",
        borderTop: "1px solid var(--border-subtle)",
      }}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-4 h-10 shrink-0 cursor-pointer select-none"
        style={{
          borderBottom: expanded ? "1px solid var(--border-subtle)" : "none",
          background: "var(--bg-panel)",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Terminal size={13} style={{ color: "var(--text-muted)" }} />
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Output
            </span>
            {output && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: getStatusBg(),
                  color: getStatusColor(),
                }}
              >
                {getStatusText()}
              </span>
            )}
          </div>
          {getStatusIcon()}
        </div>

        <div className="flex items-center gap-2">
          {output?.testResults && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-bold font-mono"
              style={{
                background:
                  output.testResults.passed === output.testResults.total
                    ? "rgba(61, 214, 140, 0.15)"
                    : "rgba(240, 107, 107, 0.15)",
                color:
                  output.testResults.passed === output.testResults.total
                    ? "var(--accent-green)"
                    : "var(--accent-red)",
              }}
            >
              {output.testResults.passed}/{output.testResults.total}
            </span>
          )}

          {expanded && output && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
              className="w-6 h-6 rounded-md flex items-center justify-center transition-all cursor-pointer"
              style={{
                background: "var(--bg-surface)",
                color: copied ? "var(--accent-green)" : "var(--text-muted)",
                border: "1px solid var(--border-subtle)",
              }}
              title="Copy output"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          )}

          {expanded ? (
            <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
          ) : (
            <ChevronUp size={14} style={{ color: "var(--text-muted)" }} />
          )}
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div
            className="flex gap-0 h-9 shrink-0 px-2"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            {(["output", "stdin"] as const).map((tab) => (
              <button
                key={tab}
                className="px-3 text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                style={{
                  color:
                    activeTab === tab
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                  borderBottom:
                    activeTab === tab
                      ? "2px solid var(--accent-blue)"
                      : "2px solid transparent",
                  background: "transparent",
                  border: "none",
                  borderBottomWidth: 2,
                  borderBottomStyle: "solid",
                  borderBottomColor:
                    activeTab === tab ? "var(--accent-blue)" : "transparent",
                }}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "stdin" && <Keyboard size={12} />}
                {tab === "output" ? "Output" : "Stdin"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-auto">
            {activeTab === "output" ? (
              <div className="p-4">
                {isRunning ? (
                  <div className="flex items-center gap-3 py-4">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(76, 154, 255, 0.15)" }}
                    >
                      <Loader2 size={16} className="animate-spin" style={{ color: "var(--accent-blue)" }} />
                    </div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        Compiling and running...
                      </div>
                      <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        Spawning sandbox container
                      </div>
                    </div>
                  </div>
                ) : output ? (
                  <div className="space-y-3">
                    {output.compileErrors && (
                      <div>
                        <div
                          className="text-[11px] font-bold uppercase tracking-wider mb-2"
                          style={{ color: "var(--accent-red)" }}
                        >
                          Compilation Errors
                        </div>
                        <pre
                          className="text-xs font-mono whitespace-pre-wrap p-3 rounded-lg leading-relaxed"
                          style={{
                            background: "rgba(240, 107, 107, 0.06)",
                            color: "var(--accent-red)",
                            border: "1px solid rgba(240, 107, 107, 0.15)",
                          }}
                        >
                          {output.compileErrors}
                        </pre>
                      </div>
                    )}

                    {output.stderr && !output.compileErrors && (
                      <div>
                        <div
                          className="text-[11px] font-bold uppercase tracking-wider mb-2"
                          style={{ color: "var(--accent-yellow)" }}
                        >
                          Stderr
                        </div>
                        <pre
                          className="text-xs font-mono whitespace-pre-wrap p-3 rounded-lg leading-relaxed"
                          style={{
                            background: "rgba(240, 180, 76, 0.06)",
                            color: "var(--accent-yellow)",
                            border: "1px solid rgba(240, 180, 76, 0.15)",
                          }}
                        >
                          {output.stderr}
                        </pre>
                      </div>
                    )}

                    {output.testResults && (
                      <div>
                        <div
                          className="text-[11px] font-bold uppercase tracking-wider mb-2"
                          style={{
                            color:
                              output.testResults.passed === output.testResults.total
                                ? "var(--accent-green)"
                                : "var(--accent-yellow)",
                          }}
                        >
                          Test Results: {output.testResults.passed}/{output.testResults.total} passed
                        </div>
                        <div className="space-y-1.5">
                          {output.testResults.details.map((d, i) => (
                            <div
                              key={i}
                              className="text-xs font-mono p-3 rounded-lg flex items-start gap-3"
                              style={{
                                background: d.passed
                                  ? "rgba(61, 214, 140, 0.06)"
                                  : "rgba(240, 107, 107, 0.06)",
                                border: `1px solid ${d.passed ? "rgba(61, 214, 140, 0.15)" : "rgba(240, 107, 107, 0.15)"}`,
                              }}
                            >
                              {d.passed ? (
                                <CheckCircle2
                                  size={14}
                                  style={{ color: "var(--accent-green)", flexShrink: 0, marginTop: 2 }}
                                />
                              ) : (
                                <XCircle
                                  size={14}
                                  style={{ color: "var(--accent-red)", flexShrink: 0, marginTop: 2 }}
                                />
                              )}
                              <div className="space-y-0.5">
                                <div
                                  className="font-semibold"
                                  style={{ color: d.passed ? "var(--accent-green)" : "var(--accent-red)" }}
                                >
                                  Test {i + 1}: {d.passed ? "PASS" : "FAIL"}
                                </div>
                                {!d.passed && (
                                  <>
                                    <div style={{ color: "var(--text-secondary)" }}>
                                      Expected: <span className="text-white">{d.expected}</span>
                                    </div>
                                    <div style={{ color: "var(--text-secondary)" }}>
                                      Got: <span style={{ color: "var(--accent-red)" }}>{d.actual}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {output.stdout && (
                      <div>
                        <div
                          className="text-[11px] font-bold uppercase tracking-wider mb-2"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Program Output
                        </div>
                        <pre
                          className="text-xs font-mono whitespace-pre-wrap p-3 rounded-lg leading-relaxed"
                          style={{
                            background: "var(--bg-surface)",
                            color: "var(--text-primary)",
                            border: "1px solid var(--border-subtle)",
                          }}
                        >
                          {output.stdout}
                        </pre>
                      </div>
                    )}

                    {!output.stdout &&
                      !output.stderr &&
                      !output.compileErrors &&
                      !output.testResults && (
                        <div className="text-xs py-4" style={{ color: "var(--text-muted)" }}>
                          (No output)
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Terminal size={24} style={{ color: "var(--text-muted)", opacity: 0.3, marginBottom: 8 }} />
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Click <span className="font-semibold" style={{ color: "var(--accent-green)" }}>Run</span> or
                      press <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}>Ctrl</kbd>+<kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}>Enter</kbd> to execute
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4">
                <div className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                  Input for <span className="font-mono" style={{ color: "var(--accent-purple)" }}>Console.ReadLine()</span>
                </div>
                <textarea
                  value={stdin}
                  onChange={(e) => onStdinChange(e.target.value)}
                  className="w-full h-24 p-3 rounded-lg text-xs font-mono resize-none outline-none"
                  style={{
                    background: "var(--bg-surface)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                  placeholder="Enter input here..."
                  spellCheck={false}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
