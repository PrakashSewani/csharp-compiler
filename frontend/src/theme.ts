import { createSystem, defineConfig, defaultConfig } from "@chakra-ui/react";

const config = defineConfig({
  preflight: false,
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: "#dbeafe" },
          100: { value: "#bfdbfe" },
          200: { value: "#93c5fd" },
          300: { value: "#60a5fa" },
          400: { value: "#3b82f6" },
          500: { value: "#2563eb" },
          600: { value: "#1d4ed8" },
          700: { value: "#1e40af" },
          800: { value: "#1e3a8a" },
          900: { value: "#172554" },
        },
        green: {
          50: { value: "#dcfce7" },
          100: { value: "#bbf7d0" },
          200: { value: "#86efac" },
          300: { value: "#4ade80" },
          400: { value: "#22c55e" },
          500: { value: "#16a34a" },
          600: { value: "#15803d" },
        },
        red: {
          50: { value: "#fef2f2" },
          100: { value: "#fecaca" },
          200: { value: "#fca5a5" },
          300: { value: "#f87171" },
          400: { value: "#ef4444" },
          500: { value: "#dc2626" },
          600: { value: "#b91c1c" },
        },
        yellow: {
          50: { value: "#fefce8" },
          100: { value: "#fef9c3" },
          200: { value: "#fef08a" },
          300: { value: "#fde047" },
          400: { value: "#facc15" },
          500: { value: "#eab308" },
          600: { value: "#ca8a04" },
        },
        purple: {
          50: { value: "#f5f3ff" },
          100: { value: "#ede9fe" },
          200: { value: "#ddd6fe" },
          300: { value: "#c4b5fd" },
          400: { value: "#a78bfa" },
          500: { value: "#8b5cf6" },
          600: { value: "#7c3aed" },
        },
        cyan: {
          50: { value: "#ecfeff" },
          100: { value: "#cffafe" },
          200: { value: "#a5f3fc" },
          300: { value: "#67e8f9" },
          400: { value: "#22d3ee" },
          500: { value: "#06b6d4" },
          600: { value: "#0891b2" },
        },
        dark: {
          50: { value: "#f0f4f8" },
          100: { value: "#c9d1db" },
          200: { value: "#8494a7" },
          300: { value: "#546478" },
          400: { value: "#374151" },
          500: { value: "#1f2937" },
          600: { value: "#182030" },
          700: { value: "#131924" },
          800: { value: "#0e1319" },
          900: { value: "#0b1015" },
          950: { value: "#070a0e" },
        },
      },
      fonts: {
        sans: { value: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif' },
        mono: { value: '"JetBrains Mono", "Fira Code", "Consolas", monospace' },
      },
    },
    semanticTokens: {
      colors: {
        "bg.app": {
          value: { _dark: "#0a0b0d", _light: "#ffffff" },
        },
        "bg.panel": {
          value: { _dark: "#0f1114", _light: "#f8fafc" },
        },
        "bg.surface": {
          value: { _dark: "#15181c", _light: "#f1f5f9" },
        },
        "bg.elevated": {
          value: { _dark: "#1b1f24", _light: "#e2e8f0" },
        },
        "bg.hover": {
          value: { _dark: "#22272e", _light: "#cbd5e1" },
        },
        "bg.active": {
          value: { _dark: "#292f36", _light: "#94a3b8" },
        },
        "border.subtle": {
          value: { _dark: "#252a31", _light: "#e2e8f0" },
        },
        "border.default": {
          value: { _dark: "#323840", _light: "#cbd5e1" },
        },
        "border.strong": {
          value: { _dark: "#454c55", _light: "#94a3b8" },
        },
        "text.primary": {
          value: { _dark: "#f0f4f8", _light: "#0f172a" },
        },
        "text.secondary": {
          value: { _dark: "#c9d1db", _light: "#475569" },
        },
        "text.muted": {
          value: { _dark: "#718096", _light: "#64748b" },
        },
        "text.accent": {
          value: { _dark: "#a8c7fa", _light: "#2563eb" },
        },
        "accent.blue": {
          value: { _dark: "#5b8def", _light: "#2563eb" },
        },
        "accent.green": {
          value: { _dark: "#22c55e", _light: "#16a34a" },
        },
        "accent.red": {
          value: { _dark: "#ef4444", _light: "#dc2626" },
        },
        "accent.yellow": {
          value: { _dark: "#facc15", _light: "#ca8a04" },
        },
        "accent.purple": {
          value: { _dark: "#a78bfa", _light: "#7c3aed" },
        },
        "accent.cyan": {
          value: { _dark: "#22d3ee", _light: "#0891b2" },
        },
      },
    },
  },
  globalCss: {
    "html, body": {
      fontFamily: "sans",
      bg: "bg.app",
      color: "text.primary",
      overflow: "hidden",
      height: "100dvh",
      lineHeight: 1.5,
    },
    "#root": {
      height: "100dvh",
    },
    "*:focus-visible": {
      outline: "2px solid accent.blue",
      outlineOffset: "2px",
      borderRadius: "4px",
    },
  },
});

export const system = createSystem(defaultConfig, config);
