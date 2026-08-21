import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
const eslintConfig = defineConfig([
  ...nextVitals,
  {
    rules: {
      "@next/next/no-img-element": "error",
      "@next/next/no-html-link-for-pages": "error",
      "react/jsx-no-target-blank": "error",
      "react/no-unescaped-entities": "error"
    }
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "node_modules/**",
    "next-env.d.ts"
  ])
]);
export default eslintConfig;