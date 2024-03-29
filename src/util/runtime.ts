export const isNode: boolean =
  // @ts-expect-error: checking for node
  typeof process !== "undefined" &&
  // @ts-expect-error: checking for node
  process.versions != null &&
  // @ts-expect-error: checking for node
  process.versions.node != null;

export const isDeno: boolean =
  // @ts-expect-error: checking for deno
  typeof Deno !== "undefined" &&
  // @ts-expect-error: checking for deno
  typeof Deno.version !== "undefined" &&
  // @ts-expect-error: checking for deno
  typeof Deno.version.deno !== "undefined";

export const isBun: boolean = 
  // @ts-expect-error: checking for bun
  typeof Bun !== "undefined" &&
  // @ts-expect-error: checking for bun
  typeof Bun.version !== "undefined";