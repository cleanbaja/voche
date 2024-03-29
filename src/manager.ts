import EventEmitter from "node:events"
import { Buffer } from 'node:buffer';

import { Synthesizer, Transcriber } from "./engines/index.ts";
import { DeepgramSTT } from "./engines/deepgram.ts";
import { ElevenLabsTTS } from "./engines/11labs.ts";

export default class Manager {
    eventbus: EventEmitter;
    stt: Transcriber;
    tts: Synthesizer;
    platform: string;

    constructor(platform: string) {
        this.eventbus = new EventEmitter();
        this.stt = new DeepgramSTT(this.eventbus, platform);
        this.tts = new ElevenLabsTTS(this.eventbus, platform);

        this.platform = platform;
    }

    public async handleEvent(event: MessageEvent<any>) {
        if (this.platform === 'twilio') {
            const msg = JSON.parse(event.data);

            if (msg.event === 'start')
                this.eventbus.emit('manager:active', msg.streamSid);

            if (msg.event === 'media')
                await this.stt.addChunk(Buffer.from(msg.media.payload, 'base64'));
        } else {
            this.stt.addChunk(event.data);
        }
    }

    public async shutdown() {
        await this.stt.disable();
        await this.tts.disable();
    }
}