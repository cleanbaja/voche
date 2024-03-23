import { DeepgramClient, createClient } from "@deepgram/sdk";
import EventEmitter from 'node:events';
import { Buffer } from 'node:buffer';

const DEEPGRAM_KEY = '49b28e9ba06d25cede49bd7a9136021bc9f2ff31';

export default class Synthesizer extends EventEmitter {
    sid: string | null;
    deepgram: DeepgramClient;

    constructor() {
        super();

        this.deepgram = createClient(DEEPGRAM_KEY);

        this.sid = null;
    }

    enable(sid: string) {
        this.sid = sid;

        console.log("TTS: Engine Enabled");
    }

    async speak(chunk: string, id: number) {
        console.log(`TTS: Speaking = ${chunk}`);

        const response = await this.deepgram.speak.request(
            { text: chunk },
            {
                model: "aura-asteria-en",
                encoding: "mulaw",
                container: "none",
                sample_rate: 8000,
            }
        );

        const getAudioBuffer = async (response: ReadableStream) => {
            const reader = response.getReader();
            const chunks = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                chunks.push(value);
            }

            const dataArray = chunks.reduce(
                (acc, chunk) => Uint8Array.from([...acc, ...chunk]),
                new Uint8Array(0)
            );

            return Buffer.from(dataArray.buffer);
        };

        const stream = await response.getStream();

        if (stream != null) {
            this.emit('audio_packet', this.encode(await getAudioBuffer(stream as ReadableStream<Uint8Array>)), id)
        }
    }

    private encode(raw: Buffer) {
        return raw.toString('base64');
    }
}