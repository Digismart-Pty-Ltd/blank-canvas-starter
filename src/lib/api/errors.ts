/** Return the server's message when it is one of the known, user-facing messages. */
export function serverMessage(err: unknown, known: string[]): string | null {
  const msg = String((err as { message?: string })?.message ?? "");
  return known.find((k) => msg.includes(k)) ?? null;
}

export function errorCode(err: unknown): string | undefined {
  return (err as { code?: string })?.code;
}
