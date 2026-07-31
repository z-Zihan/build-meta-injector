export function resolveEnvironment(options, mode) {
  if (options.environmentValue && typeof options.environmentValue === 'string') {
    const trimmed = options.environmentValue.trim();
    if (trimmed) return trimmed;
  }

  if (mode && typeof mode === 'string') {
    const trimmed = mode.trim();
    if (trimmed) return trimmed;
  }

  const keys = options.environmentKeys || [];
  for (const key of keys) {
    if (typeof key !== 'string') continue;
    const val = process.env[key];
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed) return trimmed;
    }
  }

  return null;
}
