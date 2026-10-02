import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // Carpetas de build que alterna scripts/deploy.sh
    ".next-a/**",
    ".next-b/**",
    // Compilación de las pruebas (OPERACION.md §3): sin esto, con la carpeta presente salen decenas de miles de errores falsos
    ".next-test/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Los guiones de Node en CommonJS (.cjs y los .js de scripts/) usan require(): es lo correcto en ese formato
  {
    files: ["**/*.cjs", "scripts/**/*.js", "docs/plan/scripts/**/*.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
]);

export default eslintConfig;
