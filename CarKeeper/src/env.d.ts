/// <reference types="vite/client" />

interface OcrAssetFile {
  path: string;
  size: number;
}

declare const __OCR_ASSETS__: {
  version: string;
  worker: OcrAssetFile;
  cores: Record<'relaxedsimd' | 'simd' | 'plain', OcrAssetFile>;
  lang: OcrAssetFile;
};

declare const __OCR_CACHE_NAME__: string;
