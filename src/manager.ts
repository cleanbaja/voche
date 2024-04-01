import { EventEmitter } from "tseep";
import { Buffer } from 'node:buffer';

import { type Neural, type Synthesizer, type Transcriber } from "./engines/index.ts";
import type { Platform } from "./platform/index.ts";

// engines
import { DeepgramSTT, DeepgramTTS } from "./engines/deepgram.ts";
import { Groq } from "./engines/groq.ts";

export default class Manager {
    /**
     * ## EventBus
     * 
     * This variable represents the core eventbus, designed as the primary form of
     * communication between multiple components...
     * 
     * ### Message Types
     * 
     * Messages transfered on this bus have the following
     * formats:
     * 
     * - `stt:data` - This messsage is released onto the eventbus
     *   when the stt has finished transcribing a chunk of audio
     *   data. The only layer which should be listening to messages
     *   of this nature is the neural layer, which uses it for output.
     * 
     * - `neural:data` - Message emitted when a chunk of text data
     *   is ready from the AI model. Message is subscribed to by
     *   the Synthesizer, which uses it to generate voice chunks.
     * 
     * - `tts:data` - Finally, this message contains processed packets
     *   of data, ready to be transmitted back to the source. The
     *   only handler for this message is in `index.ts`, and sends
     *   the packet back through the socket
     */
    eventbus: EventEmitter;

    platform: Platform;
    stt: Transcriber;
    tts: Synthesizer;
    neural: Neural;

    constructor(platform: Platform) {
        this.eventbus = new EventEmitter<{
            'stt:data': (data: string) => void;
            'neural:data': (data: string) => void;
            'tts:data': (data: string) => void;
        }>();

        this.stt = new DeepgramSTT(this.eventbus, platform);
        this.tts = new DeepgramTTS(this.eventbus, platform);
        this.neural = new Groq(this.eventbus);

        this.platform = platform;
    }

    public handleEvent(event: MessageEvent) {
        const result = this.platform.decode(event);

        if (result !== false)
            this.stt.addChunk(result as string | Buffer);
    }

    public async shutdown() {
        await this.stt.disable();
        await this.tts.disable();
        await this.neural.disable();
    }
}