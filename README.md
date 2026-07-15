# C# Playground — DSA Practice Environment

A web-based C# compiler and code runner designed for practicing Data Structures & Algorithms. Write C# code in a Monaco Editor (VS Code's editor), compile and run it in an isolated Docker sandbox, add test cases, and manage your solutions — all from the browser.

## Features

- **Monaco Editor** — Full C# syntax highlighting, bracket matching, autocomplete, and real-time compiler error markers
- **Sandboxed Execution** — Each run compiles and executes in an isolated Docker container (no network, memory-limited, 30s timeout)
- **Test Cases** — Define input/output test pairs; your `Solve()` method is called automatically and results are compared
- **File Management** — Create, save, browse, and delete solution files. Auto-saves as you type
- **Stdin Support** — Provide console input for problems that read from `Console.ReadLine()`
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

### 1. Create a new file

Click **New File** in the top-left, enter a name (e.g. `TwoSum`, `MergeSort`). Each file gets its own folder with a `.csproj` and `Main.cs`.

### 2. Write your solution

The editor opens with a template:

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

public class Solution
{
    public static object Solve(string input)
    {
        // TODO: Implement your solution
        // Parse input from the string parameter
        // Return the result (will be converted to string)
        return "";
    }
}
```

Implement the `Solve` method. Errors appear as red/yellow markers as you type (debounced compiler check).

### 3. Add test cases (optional)

Click the **Tests** button in the top-right to open the test case panel. Add input/expected output pairs. Your `Solve(string input)` method will be called with each input, and the return value is compared as a string against the expected output.

### 4. Run

Click the green **Run** button or press `Ctrl+Enter`. Output appears in the bottom panel — compilation errors, runtime output, and test results.

### 5. Browse old files

All saved files appear in the left sidebar. Click any file to open it, edit, and re-run.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser (localhost:3000)                                │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ File Explorer │  │ Monaco Editor│  │ Test Cases   │  │
│  └───────────────┘  └──────────────┘  └──────────────┘  │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Output Panel                                        │ │
│  └─────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │ /api/*
┌────────────────────────▼────────────────────────────────┐
│  Backend (Node.js + Express, port 3001)                  │
│  ┌──────────────┐  ┌──────────────────────────────────┐  │
│  │ File Service │  │ Executor (Docker-in-Docker)      │  │
│  │ CRUD for .cs │  │ Creates sandbox containers       │  │
│  │ files        │  │ Mounts shared volume, runs dotnet │  │
│  └──────────────┘  └──────────────┬───────────────────┘  │
└───────────────────────────────────┼──────────────────────┘
                                    │ Docker API
┌───────────────────────────────────▼──────────────────────┐
│  Sandbox Container (.NET 8 SDK)                          │
│  - Isolated: no network, 512MB RAM, 30s timeout          │
│  - Mounts shared volume for code files                   │
│  - Runs: dotnet build && dotnet run                      │
│  - Destroyed after each execution                        │
└──────────────────────────────────────────────────────────┘
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| **frontend** | 3000 | React + Vite app served by Nginx. Proxies `/api` to backend |
| **backend** | 3001 | Node.js API. File CRUD + Docker sandbox orchestration |
| **sandbox** | — | Pre-built .NET 8 SDK image. Spawned on-demand for each run |

### Shared Volume

A Docker named volume `csharp-exec-workspace` is shared between the backend and sandbox containers. The backend writes code files to this volume, and sandbox containers mount it to compile and run.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/files` | List all saved files |
| `GET` | `/api/files/:name` | Get file content + test cases |
| `POST` | `/api/files/:name` | Create/update file (body: `{code, testCases}`) |
| `DELETE` | `/api/files/:name` | Delete a file |
| `POST` | `/api/execute` | Compile + run code (body: `{code, testCases?, stdin?}`) |
| `POST` | `/api/lint` | Get compiler errors without running (body: `{code}`) |

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
