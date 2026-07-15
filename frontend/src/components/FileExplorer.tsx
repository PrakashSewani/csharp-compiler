import { FileCode, Plus, Trash2, FolderOpen, Search } from "lucide-react";
import { useState } from "react";

interface FileExplorerProps {
  files: { name: string; updatedAt: string }[];
  currentFile: string | null;
  onOpen: (name: string) => void;
  onNew: () => void;
  onDelete: (name: string) => void;
}

export function FileExplorer({
  files,
  currentFile,
  onOpen,
  onNew,
  onDelete,
}: FileExplorerProps) {
  const [search, setSearch] = useState("");

  const filtered = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <aside
      className="w-64 shrink-0 flex flex-col overflow-hidden"
      style={{
        background: "var(--bg-panel)",
        borderRight: "1px solid var(--border-subtle)",
      }}
    >
      {/* Header */}
      <div
        className="px-4 pt-4 pb-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Explorer
          </span>
          <button
            onClick={onNew}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all duration-150 cursor-pointer"
            style={{
              background: "var(--bg-surface)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-default)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--accent-blue)";
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.borderColor = "var(--accent-blue)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg-surface)";
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.borderColor = "var(--border-default)";
            }}
            title="New file"
          >
            <Plus size={13} />
          </button>
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <Search size={13} style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="bg-transparent border-none outline-none text-xs flex-1"
            style={{ color: "var(--text-primary)" }}
          />
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 py-8">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
              style={{ background: "var(--bg-surface)" }}
            >
              <FolderOpen size={24} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
            </div>
            <p className="text-xs text-center leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {search ? "No matching files" : "No files yet"}
              <br />
              {!search && (
                <button
                  onClick={onNew}
                  className="mt-2 text-xs font-medium cursor-pointer"
                  style={{ color: "var(--accent-blue)" }}
                >
                  Create your first file
                </button>
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((file) => (
              <div
                key={file.name}
                className="group flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all duration-100"
                style={{
                  background:
                    currentFile === file.name
                      ? "var(--bg-active)"
                      : "transparent",
                  border: "1px solid transparent",
                  borderColor:
                    currentFile === file.name
                      ? "var(--border-default)"
                      : "transparent",
                }}
                onClick={() => onOpen(file.name)}
                onMouseEnter={(e) => {
                  if (currentFile !== file.name)
                    e.currentTarget.style.background = "var(--bg-hover)";
                }}
                onMouseLeave={(e) => {
                  if (currentFile !== file.name)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                  style={{
                    background:
                      currentFile === file.name
                        ? "rgba(76, 154, 255, 0.15)"
                        : "var(--bg-surface)",
                  }}
                >
                  <FileCode
                    size={14}
                    style={{
                      color:
                        currentFile === file.name
                          ? "var(--accent-blue)"
                          : "var(--text-muted)",
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs font-medium truncate"
                    style={{
                      color:
                        currentFile === file.name
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                    }}
                  >
                    {file.name}
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {formatDate(file.updatedAt)}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(file.name);
                  }}
                  className="w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-100 cursor-pointer"
                  style={{
                    color: "var(--text-muted)",
                    background: "transparent",
                    border: "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(240, 107, 107, 0.15)";
                    e.currentTarget.style.color = "var(--accent-red)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-muted)";
                  }}
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-3 shrink-0"
        style={{
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--bg-panel)",
        }}
      >
        <div className="text-[10px] flex items-center justify-between" style={{ color: "var(--text-muted)" }}>
          <span>{files.length} file{files.length !== 1 ? "s" : ""}</span>
          <span>Ctrl+Enter to run</span>
        </div>
      </div>
    </aside>
  );
}
