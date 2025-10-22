import { GenericObject } from './interfaces/common.js';

export function get<T>(
  object: GenericObject,
  path: string,
  defaultValue = undefined,
): T | undefined {
  if (object == null || path == null) {
    return defaultValue;
  }

  const keys = Array.isArray(path)
    ? path
    : path.replace(/\[(\d+)\]/g, '.$1').split('.');

  let result = object;

  for (const key of keys) {
    if (result == null) return defaultValue;
    result = result[key];
  }

  return (result === undefined ? defaultValue : result) as T | undefined;
}

export function throwErr(...args: unknown[]) {
  /* eslint-disable no-console */
  console.log();
  console.error(...args);
  console.log();
  process.exit(1);
}
