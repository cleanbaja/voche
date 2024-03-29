import { LiveClient, DeepgramClient, createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import EventEmitter from 'node:events';
import { Buffer } from 'node:buffer';

import { Transcriber, Synthesizer, MediaPacket } from './index.ts';
import { createLogger } from '../util/logger.ts';
import { TTSProfiler } from '../util/profiler.ts';
import { DEEPGRAM_API_KEY } from '../util/env.ts';

const logger = createLogger('deepgram');

export class DeepgramSTT implements Transcriber {
    cognitive: LiveClient;

    constructor(bus: EventEmitter, platform: string) {
        const client = createClient(DEEPGRAM_API_KEY);

        if (platform === 'web') {
            this.cognitive = client.listen.live({
                interim_results: true,
                smart_format: true,
            });
        } else {
            this.cognitive = client.listen.live({
                model: 'nova-2-phonecall',
                smart_format: true,
                encoding: 'mulaw',
                sample_rate: 8000,
                channels: 1,
            });
        }

        this.cognitive.on(LiveTranscriptionEvents.Open, () => {
            logger.info('connection established!');

            this.cognitive.on(LiveTranscriptionEvents.Close, (ev) => {
                logger.debug(`connection closed with reason '${ev.reason}'`);
            });

            this.cognitive.on(LiveTranscriptionEvents.Transcript, (data) => {
                if (data.is_final) {
                    const msg = data.channel.alternatives[0].transcript;

                    if (msg.length !== 0)
                        bus.emit('stt:data', msg);
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
    platform: string;
    sid?: string;

    constructor(bus: EventEmitter, platform: string,) {
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
                    encoding: "mulaw",
                    container: "none",
                    sample_rate: 8000,
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
                    bus.emit('tts:data', this.encode(value));
                }
            }

            this.profiler.signalEnd();
        });
    }

    private encode(raw: Uint8Array) {
        if (this.platform === "twilio") {
            if (!this.sid)
                return;

            let packet: MediaPacket = {
                event: 'media',
                streamSid: this.sid,
                media: {
                    payload: Buffer.from(raw).toString('base64')
                }
            }
    
            return JSON.stringify(packet);
        }

        logger.warn('output for platform ' + this.platform + ' is unsupported!');
        return "";
    }

    async disable() {
        console.log((await this.profiler.toString()));
    }
}
