interface DataWrapper {
    to_dict(): Record<string, unknown>;
}

class BaseEvent implements DataWrapper {
    event: string | null = null;
    sequenceNumber: string | null = null;
    protocol: string | null = null;
    version: string | null = null;
    streamSid: string | null = null;

    constructor(d: Record<string, unknown>) {
        for (const [key, value] of Object.entries(d)) {
            if (typeof value === 'object') {
                (this as any)[key] = new BaseEvent(value as Record<string, unknown>);
            } else {
                (this as any)[key] = value;
            }
        }
    }

    to_dict(): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(this)) {
            if (value instanceof BaseEvent) {
                const nestedDict = value.to_dict();
                if (Object.keys(nestedDict).length > 0) {
                    result[key] = nestedDict;
                }
            } else if (value !== null) {
                result[key] = value;
            }
        }
        return result;
    }
}

interface MediaEvent {
    track: string | null;
    timestamp: string | null;
    chunk: string | null;
    payload: string | null;
}

class TwillioEvent extends BaseEvent {
    start: StartEvent | null = null;
    media: MediaEvent | null = null;
    stop: StopEvent | null = null;
    mark: MarkEvent | null = null;

    constructor(d: Record<string, unknown>) {
        super(d);
    }
}

class StartEvent extends BaseEvent {
    tracks: string | null = null;
    streamSid: string | null = null;

    constructor(d: Record<string, unknown>) {
        super(d);
    }
}

class StopEvent extends BaseEvent {
    accountSid: string | null = null;
    callSid: string | null = null;

    constructor(d: Record<string, unknown>) {
        super(d);
    }
}

class MarkEvent extends BaseEvent {
    name: string | null = null;

    constructor(d: Record<string, unknown>) {
        super(d);
    }
}