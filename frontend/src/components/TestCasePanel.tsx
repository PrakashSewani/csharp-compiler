import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, Beaker } from "lucide-react";
import type { TestCase } from "../api";

interface TestCasePanelProps {
  testCases: TestCase[];
  onChange: (testCases: TestCase[]) => void;
}

export function TestCasePanel({ testCases, onChange }: TestCasePanelProps) {
  const [expanded, setExpanded] = useState<number | null>(0);

  const addTestCase = () => {
    const newCases = [...testCases, { input: "", expectedOutput: "" }];
    onChange(newCases);
    setExpanded(newCases.length - 1);
  };

  const removeTestCase = (index: number) => {
    const newCases = testCases.filter((_, i) => i !== index);
    onChange(newCases);
    if (expanded === index) setExpanded(null);
    else if (expanded !== null && expanded > index) setExpanded(expanded - 1);
  };

  const updateTestCase = (
    index: number,
    field: "input" | "expectedOutput",
    value: string
  ) => {
    const newCases = [...testCases];
    newCases[index] = { ...newCases[index], [field]: value };
    onChange(newCases);
  };

  return (
    <aside
      className="w-80 shrink-0 flex flex-col overflow-hidden"
      style={{
        background: "var(--bg-panel)",
        borderLeft: "1px solid var(--border-subtle)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2">
          <Beaker size={14} style={{ color: "var(--accent-purple)" }} />
          <span
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Test Cases
          </span>
          {testCases.length > 0 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
              style={{
                background: "rgba(167, 139, 250, 0.15)",
                color: "var(--accent-purple)",
              }}
            >
              {testCases.length}
            </span>
          )}
        </div>
        <button
          onClick={addTestCase}
          className="w-6 h-6 rounded-md flex items-center justify-center transition-all duration-150 cursor-pointer"
          style={{
            background: "var(--bg-surface)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-default)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--accent-purple)";
            e.currentTarget.style.color = "#fff";
            e.currentTarget.style.borderColor = "var(--accent-purple)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg-surface)";
            e.currentTarget.style.color = "var(--text-secondary)";
            e.currentTarget.style.borderColor = "var(--border-default)";
          }}
          title="Add test case"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Test case list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {testCases.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 py-8">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
              style={{ background: "var(--bg-surface)" }}
            >
              <Beaker size={24} style={{ color: "var(--text-muted)", opacity: 0.4 }} />
            </div>
            <p className="text-xs text-center leading-relaxed" style={{ color: "var(--text-muted)" }}>
              No test cases yet
              <br />
              <span className="text-[11px]">
                Your <span className="font-mono" style={{ color: "var(--accent-purple)" }}>Solution.Solve()</span> method
                <br />
                will be called with each input
              </span>
            </p>
          </div>
        ) : (
          testCases.map((tc, i) => {
            const isOpen = expanded === i;
            const hasContent = tc.input || tc.expectedOutput;

            return (
              <div
                key={i}
                className="rounded-lg overflow-hidden transition-all duration-150"
                style={{
                  border: `1px solid ${isOpen ? "var(--border-strong)" : "var(--border-subtle)"}`,
                  background: isOpen ? "var(--bg-surface)" : "var(--bg-elevated)",
                }}
              >
                {/* Accordion header */}
                <div
                  className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
                  style={{
                    borderBottom: isOpen ? "1px solid var(--border-subtle)" : "none",
                  }}
                  onClick={() => setExpanded(isOpen ? null : i)}
                >
                  <div style={{ color: "var(--text-muted)" }}>
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                  <span
                    className="text-xs font-semibold flex-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Test {i + 1}
                  </span>
                  {hasContent && !isOpen && (
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded max-w-[120px] truncate"
                      style={{
                        background: "var(--bg-hover)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {tc.input || "(empty)"}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTestCase(i);
                    }}
                    className="w-5 h-5 rounded flex items-center justify-center opacity-60 hover:opacity-100 transition-all cursor-pointer"
                    style={{
                      background: "transparent",
                      color: "var(--text-muted)",
                      border: "none",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--accent-red)";
                      e.currentTarget.style.background = "rgba(240, 107, 107, 0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--text-muted)";
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {/* Accordion content */}
                {isOpen && (
                  <div className="p-3 space-y-3">
                    <div>
                      <label
                        className="text-[10px] font-bold uppercase tracking-wider block mb-1.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Input
                      </label>
                      <textarea
                        value={tc.input}
                        onChange={(e) => updateTestCase(i, "input", e.target.value)}
                        className="w-full h-20 p-2.5 rounded-lg text-xs font-mono resize-none outline-none"
                        style={{
                          background: "var(--bg-app)",
                          color: "var(--text-primary)",
                          border: "1px solid var(--border-subtle)",
                        }}
                        placeholder='e.g. [2,7,11,15] 9'
                        spellCheck={false}
                      />
                    </div>
                    <div>
                      <label
                        className="text-[10px] font-bold uppercase tracking-wider block mb-1.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Expected Output
                      </label>
                      <textarea
                        value={tc.expectedOutput}
                        onChange={(e) => updateTestCase(i, "expectedOutput", e.target.value)}
                        className="w-full h-20 p-2.5 rounded-lg text-xs font-mono resize-none outline-none"
                        style={{
                          background: "var(--bg-app)",
                          color: "var(--text-primary)",
                          border: "1px solid var(--border-subtle)",
                        }}
                        placeholder='e.g. [0,1]'
                        spellCheck={false}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer hint */}
      {testCases.length > 0 && (
        <div
          className="px-4 py-3 shrink-0"
          style={{
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--bg-panel)",
          }}
        >
          <div className="text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Implement{" "}
            <span className="font-mono font-semibold" style={{ color: "var(--accent-purple)" }}>
              Solution.Solve(string input)
            </span>{" "}
            and return a value. It will be compared as a string against expected output.
          </div>
        </div>
      )}
    </aside>
  );
}
