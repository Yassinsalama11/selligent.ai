declare module '@chatorai/db' {
  export const repos: any;
  export function getPrisma(): any;
  export function withTenant(tenantId: string, fn: (tx: any) => unknown): Promise<unknown>;
  export function disconnect(): Promise<void>;
}

declare module '@chatorai/ai-core' {
  export const streamReply: any;
  export const buildPrompt: any;
  export const registry: any;
  export const cost: any;
  export const clients: any;
}
