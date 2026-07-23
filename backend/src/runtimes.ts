export type LanguageId = "csharp" | "python" | "java";
export type ExecutionMode = "stdin" | "tests";

export interface RuntimeCapability {
  languageId: LanguageId;
  runtimeId: string;
  displayName: string;
  sourceFileName: string;
  executionModes: ExecutionMode[];
}

export interface RuntimeAdapter extends RuntimeCapability {
  image: string;
  prepareFiles(code: string): Record<string, string>;
  validateCommand: string;
  runCommand: string;
  parseDiagnostics(output: string): Diagnostic[];
}

export interface Diagnostic {
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning";
}

const CSPROJ = `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>
`;

function prepareCsharp(code: string): Record<string, string> {
  const hasMain = /\bstatic\s+(?:async\s+)?(?:void|int|Task(?:<int>)?)\s+Main\s*\(/.test(code);
  const hasLegacySolve = /\bclass\s+Solution\b[\s\S]*?\bstatic\s+[^\n{]+\s+Solve\s*\(\s*string(?:\s+\w+)?\s*\)/.test(code);
  const compatibilityRunner = !hasMain && hasLegacySolve
    ? `

internal static class __LegacyRunner
{
    private static void Main()
    {
        var result = Solution.Solve(Console.In.ReadToEnd());
        if (result is not null) Console.Write(result.ToString());
    }
}
`
    : "";

  return { "Program.csproj": CSPROJ, "Program.cs": code + compatibilityRunner };
}

function parseCsharpDiagnostics(output: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const regex = /Program\.cs\((\d+),(\d+)\):\s+(error|warning)\s+([A-Z]+\d+):\s+(.+?)(?:\s+\[.*)?$/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(output))) {
    diagnostics.push({
      line: Number(match[1]),
      column: Number(match[2]),
      severity: match[3] as Diagnostic["severity"],
      message: `${match[4]}: ${match[5].trim()}`,
    });
  }
  return dedupeDiagnostics(diagnostics);
}

function parsePythonDiagnostics(output: string): Diagnostic[] {
  const fileMatch = output.match(/File "main\.py", line (\d+)[^\n]*\n(?:[^\n]*\n)?([^\n]*\^)?[\s\S]*?([A-Za-z]+(?:Error|Exception): .+)/);
  if (!fileMatch) return [];
  return [{
    line: Number(fileMatch[1]),
    column: Math.max(1, (fileMatch[2]?.indexOf("^") ?? 0) + 1),
    message: fileMatch[3].trim(),
    severity: "error",
  }];
}

function parseJavaDiagnostics(output: string): Diagnostic[] {
  const lines = output.split(/\r?\n/);
  const diagnostics: Diagnostic[] = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^Main\.java:(\d+):\s+(error|warning):\s+(.+)$/);
    if (!match) continue;
    const caretLine = lines[i + 2] || lines[i + 1] || "";
    diagnostics.push({
      line: Number(match[1]),
      column: Math.max(1, caretLine.indexOf("^") + 1),
      message: match[3].trim(),
      severity: match[2] as Diagnostic["severity"],
    });
  }
  return diagnostics;
}

function dedupeDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
  const seen = new Set<string>();
  return diagnostics.filter((diagnostic) => {
    const key = `${diagnostic.line}:${diagnostic.column}:${diagnostic.severity}:${diagnostic.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const runtimes: RuntimeAdapter[] = [
  {
    languageId: "csharp",
    runtimeId: "dotnet-8",
    displayName: ".NET 8",
    sourceFileName: "Main.cs",
    executionModes: ["stdin", "tests"],
    image: process.env.DOTNET_SANDBOX_IMAGE || process.env.SANDBOX_IMAGE || "workspace-sandbox-dotnet-8",
    prepareFiles: prepareCsharp,
    validateCommand: "dotnet build --nologo -v q",
    runCommand: "dotnet bin/Debug/net8.0/Program.dll",
    parseDiagnostics: parseCsharpDiagnostics,
  },
  {
    languageId: "python",
    runtimeId: "python-3",
    displayName: "Python 3",
    sourceFileName: "main.py",
    executionModes: ["stdin", "tests"],
    image: process.env.PYTHON_SANDBOX_IMAGE || "workspace-sandbox-python-3",
    prepareFiles: (code) => ({ "main.py": code }),
    validateCommand: "python3 -m py_compile main.py",
    runCommand: "python3 -I -B main.py",
    parseDiagnostics: parsePythonDiagnostics,
  },
  {
    languageId: "java",
    runtimeId: "java-21",
    displayName: "Java 21",
    sourceFileName: "Main.java",
    executionModes: ["stdin", "tests"],
    image: process.env.JAVA_SANDBOX_IMAGE || "workspace-sandbox-java-21",
    prepareFiles: (code) => ({ "Main.java": code }),
    validateCommand: "javac Main.java",
    runCommand: "java -Xms16m -Xmx128m -XX:ActiveProcessorCount=1 Main",
    parseDiagnostics: parseJavaDiagnostics,
  },
];

export function listRuntimeCapabilities(): RuntimeCapability[] {
  return runtimes.map(({ languageId, runtimeId, displayName, sourceFileName, executionModes }) => ({
    languageId,
    runtimeId,
    displayName,
    sourceFileName,
    executionModes,
  }));
}

export function getRuntime(languageId: unknown, runtimeId: unknown): RuntimeAdapter {
  const runtime = runtimes.find((candidate) =>
    candidate.languageId === languageId && candidate.runtimeId === runtimeId
  );
  if (!runtime) throw new Error("Unsupported languageId/runtimeId combination");
  return runtime;
}

export function isLanguageId(value: unknown): value is LanguageId {
  return value === "csharp" || value === "python" || value === "java";
}

export function isExecutionMode(value: unknown): value is ExecutionMode {
  return value === "stdin" || value === "tests";
}
