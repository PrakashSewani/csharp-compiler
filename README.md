# C# Playground — DSA Practice Environment

A web-based C# compiler and code runner designed for practicing Data Structures & Algorithms. Write C# code in a Monaco Editor (VS Code's editor), compile and run it in an isolated Docker sandbox, add test cases, and manage your solutions — all from the browser.

## Features

- **Monaco Editor** — Full C# syntax highlighting, bracket matching, autocomplete, and real-time compiler error markers
- **Sandboxed Execution** — Each run compiles and executes in an isolated Docker container (no network, memory-limited, 30s timeout)
- **Test Cases** — Define input/output test pairs; your `Solve()` method is called automatically and results are compared
- **Solution/Folder Structure** — Organize files into solution folders, each with its own `.sln` and `.csproj`
- **Per-file Stdin** — Each file has its own stdin tab for providing console input
- **Inline Errors** — Compilation errors displayed inline in the editor after running code
- **Error Persistence** — Errors survive page refreshes via localStorage
- **Command Palette** — `Ctrl+K` to quickly navigate files, run code, toggle panels, and more
- **Resizable Panels** — Drag panel borders to resize the sidebar, editor, output, and test cases
- **Dark Mode** — Premium dark IDE theme with Chakra UI
- **Configurable Storage** — Change where solution files are stored on disk, with migration support
- **Keyboard Shortcuts** — `Ctrl+Enter` (run), `Ctrl+N` (new solution), `Ctrl+B` (toggle sidebar), `Ctrl+Shift+T` (toggle tests), `Ctrl+S` (save)
- **Docker-based** — Runs entirely in containers. No local .NET SDK or Node.js installation needed

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) (v2+)

That's it. Nothing else needed on your machine.

## Quick Start

```bash
# Clone the repo
git clone https://github.com/your-username/csharp-compiler.git
cd csharp-compiler

# Build and start everything
docker compose up --build

# Open in browser
# → http://localhost:3000
```

First run takes a few minutes to download the .NET SDK image (~300MB). Subsequent runs are instant.

## Usage

### 1. Create a new solution

Click **New Solution** in the top-left or press `Ctrl+N`. Enter a name (e.g. `TwoSum`, `MergeSort`). Each solution is a folder containing one or more files.

### 2. Add a file to a solution

Click the **+** icon next to a solution in the sidebar, or click **New File** in the header. Each file gets its own `.csproj` and `Main.cs` inside the solution folder.

### 3. Write your solution

The editor opens with a template:

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

public class Solution
{
    public static object Solve(string input)
    {
        // input: test case input (from Test Cases panel) or null
        // Stdin: read with Console.ReadLine() from Stdin tab

        // Example: read from stdin
        // var line = Console.ReadLine();

        return "";
    }
}
```

Implement the `Solve` method. Errors appear as red/yellow markers as you type (debounced compiler check).

### 4. Add test cases (optional)

Click the **Tests** button in the top-right or press `Ctrl+Shift+T` to open the test case panel. Add input/expected output pairs. Your `Solve(string input)` method will be called with each input, and the return value is compared as a string against the expected output.

### 5. Provide stdin (optional)

Switch to the **Stdin** tab in the output panel to provide input for `Console.ReadLine()` calls. Each file has its own独立 stdin.

### 6. Run

Click the green **Run** button or press `Ctrl+Enter`. Output appears in the bottom panel — compilation errors, runtime output, and test results. Compilation errors are also displayed inline in the editor.

### 7. Browse and manage solutions

All solutions and files appear in the left sidebar. Click any file to open it. Right-click to rename or delete solutions. Press `Ctrl+B` to toggle the sidebar.

### 8. Command Palette

Press `Ctrl+K` to open the command palette for quick navigation, running code, toggling panels, and more.

### 9. Settings

Click the gear icon to open Settings. Configure the storage path for where solution files are saved on disk. You can migrate existing files to a new location.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser (localhost:3000)                                │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ File Explorer │  │ Monaco Editor│  │ Test Cases   │  │
│  │ (Solutions)   │  │              │  │ (per-file)   │  │
│  └───────────────┘  └──────────────┘  └──────────────┘  │
│  ┌───────────────┐  ┌──────────────────────────────────┐ │
│  │ Command       │  │ Output Panel (stdin + results)   │ │
│  │ Palette       │  │                                  │ │
│  └───────────────┘  └──────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Status Bar (save state, error count)                │ │
│  └─────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │ /api/*
┌────────────────────────▼────────────────────────────────┐
│  Backend (Node.js + Express, port 3001)                  │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │ File Service │  │ Config Service │  │ Executor     │  │
│  │ Solutions +  │  │ Storage path   │  │ (Docker-in-  │  │
│  │ Files CRUD   │  │ + migration    │  │  Docker)     │  │
│  └──────────────┘  └────────────────┘  └──────┬───────┘  │
└───────────────────────────────────────────────┼──────────┘
                                                │ Docker API
┌───────────────────────────────────────────────▼──────────┐
│  Sandbox Container (.NET 8 SDK)                          │
│  - Long-running service (healthy when dotnet available)  │
│  - Isolated: no network, 512MB RAM, 30s timeout          │
│  - Mounts shared volume for code files                   │
│  - Runs: dotnet build && dotnet run                      │
└──────────────────────────────────────────────────────────┘
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| **frontend** | 3000 | React + Vite app served by Nginx. Proxies `/api` to backend |
| **backend** | 3001 | Node.js API. Solution/file CRUD + Docker sandbox orchestration + config |
| **sandbox** | — | Long-running .NET 8 SDK container. Healthy when `dotnet --version` succeeds |

### Shared Volume

A Docker named volume `csharp-exec-workspace` is shared between the backend and sandbox containers. The backend writes code files to this volume, and sandbox containers mount it to compile and run.

## API Endpoints

### Solutions

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/solutions` | List all solution folders with their files |
| `POST` | `/api/solutions` | Create a new solution (body: `{name}`) |
| `PUT` | `/api/solutions/:name` | Rename a solution (body: `{newName}`) |
| `DELETE` | `/api/solutions/:name` | Delete a solution and all its files |

### Files (within solutions)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/solutions/:solution/files` | List files in a solution |
| `GET` | `/api/solutions/:solution/files/:file` | Get file content + test cases |
| `POST` | `/api/solutions/:solution/files/:file` | Create/update file (body: `{code, testCases}`) |
| `DELETE` | `/api/solutions/:solution/files/:file` | Delete a file |

### Execution

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/execute` | Compile + run code (body: `{code, testCases?, stdin?}`) |
| `POST` | `/api/lint` | Get compiler errors without running (body: `{code}`) |

### Settings

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/settings` | Get current config (storage path, etc.) |
| `PUT` | `/api/settings` | Update config (body: `{storagePath}`) |
| `POST` | `/api/settings/migrate` | Migrate files to new storage path (body: `{storagePath, mode}`) |

## Stopping

```bash
docker compose down
```

To also remove the shared volume (deletes cached build artifacts):

```bash
docker compose down -v
```

## License

MIT
