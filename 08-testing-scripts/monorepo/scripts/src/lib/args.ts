export function parseArgs(argv = process.argv.slice(2)) {
  const args = new Map<string, string | boolean>();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith("--")) {
      continue;
    }

    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const key = rawKey.trim();

    if (!key) {
      continue;
    }

    if (inlineValue !== undefined) {
      args.set(key, inlineValue);
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      args.set(key, next);
      index += 1;
      continue;
    }

    args.set(key, true);
  }

  return args;
}

export function argString(
  args: Map<string, string | boolean>,
  name: string,
): string | undefined {
  const value = args.get(name);
  return typeof value === "string" ? value : undefined;
}
