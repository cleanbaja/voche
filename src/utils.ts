export interface MediaEvent {
  track?: string;
  timestamp?: string;
  chunk?: string;
  payload: string;
}

export interface MediaPacket {
  event: string;
  streamSid: string;
  media: MediaData;
}

export interface MediaData {
  payload: string;
}

export interface StopEvent {
  accountSid: string;
  callSid: string;
}

export interface StartEvent {
  tracks: string;
  streamSid: string;
}

export interface MarkEvent {
  name?: string;
}

export class TwilioPacket {
  event: string | null = null
  sequenceNumber: string | null = null;
  protocol: string | null = null;
  version: string | null = null;
  streamSid: string | null = null;

  start: StartEvent | null = null;
  media: MediaEvent | null = null;
  stop: StopEvent | null = null;
  mark: MarkEvent | null = null;

  constructor(sid: string, event: string) {
    this.streamSid = sid;
    this.event = event;
  }
}

export class ObservableArray<T> extends Array<T> {
  private onPushCallback: (item: T) => void;

  constructor(onPushCallback: (item: T) => void, ...items: T[]) {
    super(...items);
    this.onPushCallback = onPushCallback;
  }

  push(...items: T[]): number {
    const result = super.push(...items);
    if (items[items.length - 1] == '') {
      items = items.slice(0, items.length - 1)
    } else if (items.length > 0) {
      this.onPushCallback(items[items.length - 1]);
    }

    return result;
  }
}

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
