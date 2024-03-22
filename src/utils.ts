export interface MediaEvent {
    track?: string;
    timestamp?: string;
    chunk?: string;
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