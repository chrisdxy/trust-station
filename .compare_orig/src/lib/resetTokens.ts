// Store reset tokens (in production, should use database)
// Use globalThis to avoid Next.js type checking issues with module-level Maps
declare global {
  var __resetTokens: Map<string, { email: string; expiresAt: Date }> | undefined;
}

if (!globalThis.__resetTokens) {
  globalThis.__resetTokens = new Map();
}

export const resetTokens = globalThis.__resetTokens;
