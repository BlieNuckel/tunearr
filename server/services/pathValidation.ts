import fs from "fs";
import path from "path";

export interface PathValidationResult {
  valid: boolean;
  error?: string;
}

const MAX_SUGGESTIONS = 20;

export function validateWritableDirectory(
  dirPath: string
): PathValidationResult {
  if (!fs.existsSync(dirPath)) {
    return {
      valid: false,
      error: `Path "${dirPath}" does not exist. Make sure the directory is created or the volume is mounted.`,
    };
  }

  if (!fs.statSync(dirPath).isDirectory()) {
    return {
      valid: false,
      error: `Path "${dirPath}" is not a directory.`,
    };
  }

  try {
    fs.accessSync(dirPath, fs.constants.W_OK);
  } catch {
    return {
      valid: false,
      error: `Tunearr does not have write permission for "${dirPath}".`,
    };
  }

  return { valid: true };
}

export function listDirectorySuggestions(input: string): string[] {
  if (!input || !path.isAbsolute(input)) {
    return [];
  }

  const endsWithSeparator = input.endsWith(path.sep);
  const baseDir = endsWithSeparator ? input : path.dirname(input);
  const prefix = endsWithSeparator ? "" : path.basename(input);

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(baseDir, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name.toLowerCase().startsWith(prefix.toLowerCase()))
    .filter((name) => prefix.startsWith(".") || !name.startsWith("."))
    .sort()
    .slice(0, MAX_SUGGESTIONS)
    .map((name) => path.join(baseDir, name));
}
