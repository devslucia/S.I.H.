export function errorMessage(e: unknown): string | undefined {
  if (e instanceof Error) return e.message;
  return undefined;
}

export function prismaErrorCode(e: unknown): string | undefined {
  if (typeof e === "object" && e !== null && "code" in e) {
    const code = (e as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}
