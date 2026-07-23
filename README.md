# Algorithm Desk

Algorithm Desk is a self-hosted, multilingual code-practice workspace for writing and running single-file C#, Python, and Java problems. It combines a Monaco-based editor, persisted collections, stdin/stdout test cases, compiler diagnostics, and isolated Docker execution.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Runtimes](https://img.shields.io/badge/runtimes-.NET%208%20%7C%20Python%203%20%7C%20Java%2021-5b8def)

## Features

- C# with .NET 8, Python 3, and Java 21.
- Runtime-aware starter templates and Monaco syntax highlighting.
- Collections containing persisted coding problems.
- Standard-input runs and reusable stdin/stdout test cases.
- Language-specific compilation, validation, and inline diagnostics.
- Automatic saving of source, test cases, execution mode, and scratch input.
- Responsive IDE-style interface for desktop and narrower screens.
- Confirmation before deleting a problem or an entire collection.
- Disposable Docker containers with no network access and resource limits.
- Compatibility support for existing C# `Solution.Solve(string)` problems.

## Quick Start

Requirements:

- Docker with Docker Compose
- Ports `3000` and `3001` available

Start the complete application:

```bash
docker compose up --build
```

Open:

- Workspace: `http://localhost:3000`
- Backend API: `http://localhost:3001`

Stop the application:

```bash
docker compose down
```

## Supported Runtimes

Algorithm Desk uses a trusted server-side runtime registry. Clients select a known runtime ID and cannot submit arbitrary images or shell commands.

| Language | Runtime ID | Source file | Docker image |
|---|---|---|---|
| C# | `dotnet-8` | `Main.cs` | `workspace-sandbox-dotnet-8` |
| Python | `python-3` | `main.py` | `workspace-sandbox-python-3` |
| Java | `java-21` | `Main.java` | `workspace-sandbox-java-21` |

Runtime image names and execution settings can be overridden using the variables documented in `.env.example`.

## How Execution Works

Every run follows the same language-neutral model:

1. The backend creates a unique temporary workspace.
2. The selected runtime adapter materializes the required source and build files.
3. A disposable container validates or compiles the source.
4. The program runs with supplied input piped through stdin.
5. The backend captures stdout, stderr, exit status, timeout state, and diagnostics.
6. The container and temporary workspace are removed.

Execution modes:

- **Standard input:** runs the program once with the saved scratch input.
- **Test cases:** runs every test independently and compares trimmed stdout with trimmed expected output.

Runtime commands:

- C#: `dotnet build`, followed by the generated .NET assembly.
- Python: `python3 -m py_compile main.py`, followed by isolated Python execution.
- Java: `javac Main.java`, followed by a memory-constrained JVM process.

## Sandbox Controls

Execution containers currently use:

- No network access.
- Memory and CPU limits.
- PID limits.
- Dropped Linux capabilities.
- `no-new-privileges`.
- Wall-clock timeouts.
- Capped captured output.
- Trusted runtime images selected by the backend.

The backend controls Docker through the Docker socket. Treat this application as a trusted local or private deployment unless you add authentication and move execution to a separately isolated runner service. Mounting the Docker socket into a public API service carries host-level security risk.

## Project Structure

```text
algorithm-desk/
├── backend/                 Express and TypeScript API
│   └── src/
│       ├── executor.ts      Generic Docker execution lifecycle
│       ├── fileService.ts   Persistence and schema migration
│       ├── index.ts         HTTP API
│       └── runtimes.ts      Trusted language/runtime adapters
├── frontend/                React, Chakra UI, Monaco, and Vite
├── sandbox/                 Runtime Dockerfiles
├── files/                   Persisted collections and problems
└── docker-compose.yml       Complete local deployment
```

## Problem Storage

Each problem is stored in its own directory with one source file and `meta.json`:

```json
{
  "schemaVersion": 2,
  "name": "TwoSum",
  "languageId": "python",
  "runtimeId": "python-3",
  "sourceFileName": "main.py",
  "executionMode": "tests",
  "scratchStdin": "",
  "testCases": [
    {
      "input": "1 2",
      "expectedOutput": "3"
    }
  ],
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

Legacy metadata without multilingual fields is migrated when read using these defaults:

```text
languageId:     csharp
runtimeId:      dotnet-8
sourceFileName: Main.cs
executionMode:  stdin
```

Existing source code is not rewritten. Older C# problems exposing `Solution.Solve(string)` receive a narrow compatibility entry point at execution time.

## API

### Runtime Capabilities

```http
GET /api/runtimes
```

Returns the trusted language/runtime combinations available to the client.

### Collections And Problems

The API retains `/api/solutions` for backward compatibility, while the UI calls these entities collections.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/solutions` | List collections and problem metadata |
| `POST` | `/api/solutions` | Create a collection |
| `PUT` | `/api/solutions/:name` | Rename a collection |
| `DELETE` | `/api/solutions/:name` | Delete a collection and its problems |
| `GET` | `/api/solutions/:collection/files` | List problems in a collection |
| `GET` | `/api/solutions/:collection/files/:problem` | Read a problem |
| `POST` | `/api/solutions/:collection/files/:problem` | Create or save a problem |
| `DELETE` | `/api/solutions/:collection/files/:problem` | Delete a problem |

Example save body:

```json
{
  "languageId": "java",
  "runtimeId": "java-21",
  "sourceFileName": "Main.java",
  "executionMode": "stdin",
  "scratchStdin": "hello",
  "code": "public class Main { ... }",
  "testCases": []
}
```

### Execute

```http
POST /api/execute
```

```json
{
  "languageId": "python",
  "runtimeId": "python-3",
  "executionMode": "tests",
  "code": "import sys\nprint(sys.stdin.read().strip())",
  "testCases": [
    {
      "input": "desk",
      "expectedOutput": "desk"
    }
  ]
}
```

### Lint Or Validate

```http
POST /api/lint
```

```json
{
  "languageId": "csharp",
  "runtimeId": "dotnet-8",
  "code": "using System; ..."
}
```

Diagnostics are normalized as:

```json
{
  "line": 4,
  "column": 12,
  "message": "Syntax error",
  "severity": "error"
}
```

## Local Development

The easiest development environment is Docker Compose because code execution requires Docker images and a shared execution workspace.

Backend type-check/build:

```bash
cd backend
npm install
npm run build
```

Frontend development:

```bash
cd frontend
npm install
npm run dev
```

Frontend production build:

```bash
cd frontend
npm run build
```

## Configuration

Copy `.env.example` to `.env` to override defaults:

```bash
cp .env.example .env
```

Important variables:

| Variable | Purpose |
|---|---|
| `EXEC_OUTPUT_LIMIT_BYTES` | Maximum captured output per process |
| `DOTNET_SANDBOX_IMAGE` | Trusted .NET runtime image |
| `PYTHON_SANDBOX_IMAGE` | Trusted Python runtime image |
| `JAVA_SANDBOX_IMAGE` | Trusted Java runtime image |
| `EXEC_WORKSPACE_VOLUME` | Docker volume shared with execution containers |

## Repository Rename

Recommended repository name:

```text
algorithm-desk
```

After renaming the repository on GitHub, update the local remote if necessary:

```bash
git remote set-url origin https://github.com/PrakashSewani/algorithm-desk.git
```

GitHub normally redirects the previous repository URL, but updating local clones, deployment configuration, badges, and bookmarks avoids relying on that redirect.

## Current Scope

Included:

- Single source file per problem.
- C#, Python, and Java standard-library execution.
- Standard input and expected-output tests.
- Persisted local collections.

Not yet included:

- Multi-file projects.
- Arbitrary dependency installation.
- Maven, Gradle, pytest, NuGet, or other framework workflows.
- Full language-server IntelliSense.
- Debugger and breakpoints.
- Authentication or multi-user authorization.

## License

MIT License. See `LICENSE`.
