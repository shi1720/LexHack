/** Directories that never carry compliance-relevant signal but blow up ingest cost. */
export const IGNORED_DIRS: ReadonlySet<string> = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', 'out', 'target', 'vendor',
  '__pycache__', '.venv', 'venv', 'env', '.tox', '.mypy_cache', '.pytest_cache',
  'coverage', '.nyc_output', '.turbo', '.cache', '.parcel-cache', '.gradle',
  'bin', 'obj', '.idea', '.vscode', '.svelte-kit', '.nuxt', 'Pods', '.terraform',
  'site-packages', '.pnpm-store', 'bower_components', '.yarn',
]);

const BINARY_EXT = new Set([
  'png','jpg','jpeg','gif','webp','avif','ico','bmp','tiff','svgz',
  'pdf','zip','gz','tgz','bz2','xz','7z','rar','tar',
  'woff','woff2','ttf','otf','eot',
  'mp3','mp4','mov','avi','webm','wav','ogg','flac',
  'so','dylib','dll','exe','bin','o','a','class','jar','wasm',
  'pyc','pyo','db','sqlite','sqlite3','pack','idx','lock','node',
  'safetensors','onnx','pt','pth','h5','ckpt','pkl','npy','npz','parquet','arrow',
]);

export function isBinaryPath(path: string): boolean {
  const ext = path.toLowerCase().split('.').pop();
  return !!ext && BINARY_EXT.has(ext);
}

/** Lockfiles are read for dependency extraction but never scanned for signals. */
export function isLockfile(path: string): boolean {
  const base = path.split('/').pop() ?? '';
  return /^(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|poetry\.lock|Gemfile\.lock|Cargo\.lock|composer\.lock|uv\.lock)$/.test(base);
}

export function isIgnoredPath(path: string): boolean {
  const parts = path.split('/');
  return parts.some((p) => IGNORED_DIRS.has(p)) || isBinaryPath(path);
}

export const INGEST_LIMITS = {
  maxFiles: 4000,
  maxFileBytes: 512 * 1024,
  maxTotalBytes: 32 * 1024 * 1024,
} as const;
