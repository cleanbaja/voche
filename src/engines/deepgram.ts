import { LiveClient, DeepgramClient, createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import EventEmitter from 'node:events';
import { Buffer } from 'node:buffer';

import { type Transcriber, type Synthesizer } from './index.ts';
import { createLogger } from '../util/logger.ts';
import { TTSProfiler } from '../util/profiler.ts';
import { DEEPGRAM_API_KEY } from '../util/env.ts';
import type { Platform } from '../platform/index.ts';

const logger = createLogger('deepgram');

export class DeepgramSTT implements Transcriber {
    cognitive: LiveClient;
    queue: string[];

    constructor(bus: EventEmitter, platform: Platform) {
        const client = createClient(DEEPGRAM_API_KEY);
        this.queue = [];

        if (platform.hasContainer(true)) {
            this.cognitive = client.listen.live({
                interim_results: true,
                punctuate: true,
                endpointing: 100,
            });
        } else {
            const format = platform.getInputAudioFormat();

            this.cognitive = client.listen.live({
                model: 'nova-2-phonecall',
                punctuate: true,
                interim_results: true,
                endpointing: 100,
                encoding: format.encoding,
                sample_rate: format.sample_rate,
                channels: 1,
            });
        }

        this.cognitive.on(LiveTranscriptionEvents.Open, () => {
            logger.info('connection established!');

            this.cognitive.on(LiveTranscriptionEvents.Close, (ev) => {
                logger.debug(`connection closed with reason '${ev.reason}'`);
            });

            this.cognitive.on(LiveTranscriptionEvents.Transcript, (data) => {
                const text = data.channel.alternatives[0].transcript;

                // skip empty packets
                if (text.length === 0 || !data.is_final || !data.speech_final)
                    return;

                // add only complete packets with transcripting to the queue
                if (text.match(/[.;?!]/) !== null) {
                    bus.emit('stt:data', this.queue.join(' ') + text);
                    this.queue = [];

                    // TODO(med): figure out comma edge-cases
                } else {
                    this.queue.push(text);
                }
            });

            this.cognitive.on(LiveTranscriptionEvents.Metadata, (data) => {
                logger.info('metadata: ' + data);
            });

            this.cognitive.on(LiveTranscriptionEvents.Error, (err) => {
                logger.error(err);
            });
        });
    }

    async addChunk(data: string | Buffer) {
        if (this.cognitive.getReadyState() === 1) {
            // @ts-ignore: socket.send takes a Buffer
            this.cognitive.send(data);
        }
    }

    async disable() {
        if (this.cognitive.getReadyState() === 1) {
            this.cognitive.finish();
            this.cognitive.removeAllListeners();
        }
    }
}

export class DeepgramTTS implements Synthesizer {
    deepgram: DeepgramClient;
    profiler: TTSProfiler;
    platform: Platform;
    sid?: string;

    constructor(bus: EventEmitter, platform: Platform) {
        this.deepgram = createClient(DEEPGRAM_API_KEY);
        this.platform = platform;

        this.profiler = new TTSProfiler();

        bus.on('manager:active', (streamSid: string) => {
            this.sid = streamSid;
        });

        bus.on('stt:data', async (data: string) => {
            this.profiler.signalStart();

            const response = await this.deepgram.speak.request(
                { text: data },
                {
                    model: "aura-asteria-en",
                    ...this.platform.getOutputAudioFormat()
                }
            );

            const stream = await response.getStream();

            if (stream) {
                const reader = stream.getReader();
                logger.debug('tts: speaking packets for \'' + data + '\'');

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    this.profiler.signalFirstByte();
                    bus.emit('tts:data', this.platform.encode(value));
                }
            }

            this.profiler.signalEnd();
        });
    }

    async disable() {
        console.log((await this.profiler.toString()));
    }
}
