import { type Synthesizer } from './index.ts';
import { TTSProfiler } from '../util/profiler.ts';
import { XI_API_KEY } from '../util/env.ts';
import EventEmitter from 'node:events';
import type { Platform } from '../platform/index.ts';

export class ElevenLabsTTS implements Synthesizer {
    socket: WebSocket;
    platform: Platform;
    profiler: TTSProfiler;
    sid?: string;

    constructor(bus: EventEmitter, platform: Platform) {
        this.platform = platform;
        this.profiler = new TTSProfiler();
        this.socket = new WebSocket('wss://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM/stream-input?model_id=eleven_monolingual_v1&output_format=ulaw_8000&optimize_streaming_latency=1')

        // connection is opened with elevenlabs
        this.socket.addEventListener('open', () => {
            this.socket.send(JSON.stringify({
                text: " ",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.8
                },
                xi_api_key: XI_API_KEY
            }));
        });

        // audio packet recieved from elevenlabs
        this.socket.addEventListener('message', (ev: MessageEvent<any>) => {
            const data = JSON.parse(ev.data);
            this.profiler.signalFirstByte();

            if (data.isFinal) {
                this.profiler.signalEnd();

                return;
            }

            bus.emit('tts:data', this.platform.encode(data.audio));
        });

        // twilio socket is active with stream info
        bus.on('manager:active', (streamSid: string) => {
            this.sid = streamSid;
        });

        // stt has finished transcribing audio chunk
        bus.on('stt:data', async (data: string) => {
            this.profiler.signalStart();

            this.socket.send(JSON.stringify({ "text": data, "try_trigger_generation": true }))
        });
    }

    async disable() {
        this.socket.close();

        console.log((await this.profiler.toString()));
    }
}
