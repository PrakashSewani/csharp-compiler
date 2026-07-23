import type { ExecutionMode, LanguageCapability, LanguageId } from "./api";

export const LANGUAGE_LABELS: Record<LanguageId, string> = {
  csharp: "C#",
  python: "Python",
  java: "Java",
};

export function sourceFileName(name: string, languageId: LanguageId, capability?: LanguageCapability) {
  void name;
  void capability;
  return languageId === "python" ? "main.py" : languageId === "java" ? "Main.java" : "Main.cs";
}

export function starterTemplate(languageId: LanguageId, executionMode: ExecutionMode, fileName: string) {
  if (languageId === "python") {
    return executionMode === "tests"
      ? `import sys\n\ndef solve(data: str) -> str:\n    return data.strip()\n\nif __name__ == "__main__":\n    print(solve(sys.stdin.read()))\n`
      : `import sys\n\ndef main() -> None:\n    data = sys.stdin.read()\n    print(data.strip())\n\nif __name__ == "__main__":\n    main()\n`;
  }

  if (languageId === "java") {
    const className = fileName.replace(/\.java$/i, "") || "Main";
    return `import java.io.*;\n\npublic class ${className} {\n    public static void main(String[] args) throws Exception {\n        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));\n        String input = reader.lines().reduce("", (a, b) -> a + (a.isEmpty() ? "" : "\\n") + b);\n        System.out.print(input);\n    }\n}\n`;
  }

  return `using System;\n\npublic class Program\n{\n    public static void Main()\n    {\n        var input = Console.In.ReadToEnd();\n        Console.Write(input);\n    }\n}\n`;
}
