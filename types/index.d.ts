/**
 * Position within the HTML document where the metadata comment block is injected.
 */
export type InjectPosition =
  | 'after-doctype'
  | 'head-start'
  | 'head-end'
  | 'body-start'
  | 'body-end'
  | 'top'
  | 'bottom';

/**
 * User-facing configuration accepted by every adapter and by `resolveOptions`.
 * All fields are optional; omitted fields fall back to `defaultOptions`.
 */
export interface BuildMetaInjectorOptions {
  /** Inject the build timestamp. Default: `true`. */
  buildTime?: boolean;
  /** Inject the package version read from the nearest `package.json`. Default: `true`. */
  version?: boolean;
  /** Inject the resolved environment name. Default: `true`. */
  environment?: boolean;
  /** Inject the short (or full, see `fullCommitHash`) Git commit hash. Default: `true`. */
  commitHash?: boolean;
  /** Inject the latest Git commit message. Default: `true`. */
  commitMessage?: boolean;
  /** Inject the current Git branch name. Default: `false`. */
  branch?: boolean;
  /** Explicit environment value; takes precedence over build tool mode and `environmentKeys`. Default: `undefined`. */
  environmentValue?: string;
  /** Environment variable names checked (in order) to resolve the environment. Default: `['APP_ENV', 'DEPLOY_ENV', 'NODE_ENV', 'MODE']`. */
  environmentKeys?: string[];
  /** IANA time zone used to format the build time. Default: `'Asia/Shanghai'`. */
  timeZone?: string;
  /** Locale used to format the build time. Default: `'zh-CN'`. */
  locale?: string;
  /** Where in the HTML document to inject the comment block. Default: `'after-doctype'`. */
  position?: InjectPosition;
  /** Inject the full (40-char) commit hash in addition to the short one. Default: `false`. */
  fullCommitHash?: boolean;
  /** Whether to run the injection in development mode. Default: `true`. */
  applyInDev?: boolean;
  /** Arbitrary extra key/value pairs injected as additional comments. Default: `{}`. */
  customData?: Record<string, unknown>;
  /** Project root used to resolve `package.json` and run Git commands. Default: `undefined` (uses build tool root or `process.cwd()`). */
  root?: string;
  /** Enable verbose debug logging. Default: `false`. */
  debug?: boolean;
  /** Path to the source HTML file (used by the esbuild adapter, which has no HTML pipeline of its own). Default: `undefined`. */
  html?: string;
  /** Path the injected HTML should be written to (used by the esbuild adapter). Default: `options.html`'s directory + `index.html`. */
  outputHtml?: string;
}

/**
 * Fully-resolved options, as returned by `resolveOptions`. Every recognized field is present;
 * unrecognized fields passed by the user are dropped and invalid values fall back to defaults.
 */
export interface ResolvedOptions {
  buildTime: boolean;
  version: boolean;
  environment: boolean;
  commitHash: boolean;
  commitMessage: boolean;
  branch: boolean;
  environmentValue: string | undefined;
  environmentKeys: string[];
  timeZone: string;
  locale: string;
  position: InjectPosition;
  fullCommitHash: boolean;
  applyInDev: boolean;
  customData: Record<string, unknown>;
  root: string | undefined;
  debug: boolean;
  html: string | undefined;
  outputHtml: string | undefined;
}

/** Build-tool context passed to `collectMeta`. */
export interface MetaContext {
  /** Current build mode (e.g. `'development'` / `'production'`), used to resolve the environment. */
  mode?: string;
  /** Project root, used to resolve `package.json` and run Git commands. */
  root?: string;
}

/** Git metadata collected by `collectGitInfo`. Any field may be absent if the Git command failed or was not requested. */
export interface GitInfo {
  shortHash?: string | null;
  fullHash?: string | null;
  commitMessage?: string | null;
  branch?: string | null;
}

/**
 * Low-level hook used to execute a `git` subcommand; injectable for testing.
 * Defaults to spawning the real `git` binary via `child_process.execFileSync`.
 */
export type GitRunner = (args: string[], cwd: string | undefined, timeout: number) => string | null;

/** Resolve user-supplied options against `defaultOptions`, dropping unknown/invalid fields. */
export function resolveOptions(userOptions?: BuildMetaInjectorOptions): ResolvedOptions;

/** The default option values used by `resolveOptions`. */
export const defaultOptions: ResolvedOptions;

/** Collect Git metadata (commit hash, message, branch) for the given options. */
export function collectGitInfo(options: ResolvedOptions, gitRunner?: GitRunner): GitInfo;

/**
 * Resolve the environment name from, in priority order: `options.environmentValue`,
 * the build tool `mode`, then the first defined variable in `options.environmentKeys`.
 */
export function resolveEnvironment(options: ResolvedOptions, mode?: string | null): string | null;

/** Read the `version` field from the nearest `package.json`, walking up from `root`. */
export function readPackageVersion(
  root?: string,
  fsImpl?: { readFileSync: (path: string, encoding: string) => string },
  pathImpl?: {
    dirname: (path: string) => string;
    resolve: (...paths: string[]) => string;
    join: (...paths: string[]) => string;
  }
): string | null;

/** Format the current time for the given time zone/locale as `YYYY/M/D HH:mm:ss`. */
export function formatTime(timeZone?: string, locale?: string): string | null;

/** Sanitize a value for safe inclusion inside an HTML comment (strips control chars, escapes `--`, truncates). */
export function sanitizeCommentValue(value: unknown, maxLength?: number): string;

/** Sanitize a key for safe inclusion inside an HTML comment (also strips `<`/`>`). */
export function sanitizeCommentKey(key: unknown, maxLength?: number): string;

/** Insert a block of HTML comments into `html` at the given position. Returns `html` unchanged if there's nothing to inject. */
export function injectHtml(html: string, comments: string[], position?: InjectPosition | string): string;

/** Resolve options and collect every enabled metadata comment line (build time, version, environment, Git info, custom data). */
export function collectMeta(userOptions?: BuildMetaInjectorOptions, context?: MetaContext): string[];
