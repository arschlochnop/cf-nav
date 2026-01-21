/// <reference types="vite/client" />

/**
 * Vite 环境变量类型声明
 * 用于 TypeScript 识别 import.meta.env 中的环境变量
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
