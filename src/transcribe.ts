import { createClient, LiveClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import EventEmitter from 'node:events';
import { Buffer } from 'node:buffer';

const DEEPGRAM_KEY = '49b28e9ba06d25cede49bd7a9136021bc9f2ff31';

export default class Transcriber extends EventEmitter {
    cognitive: LiveClient;
    session_text: string;
    isFinal = false;

    constructor() {
        super();

        const deepgram = createClient(DEEPGRAM_KEY);

        this.cognitive = deepgram.listen.live({
            model: "nova-2-phonecall",
            smart_format: true,
            encoding: "mulaw",
            sample_rate: 8000,
            channels: 1,
            punctuate: true,
            interim_results: true,
            endpointing: 200,
            utterance_end_ms: 1000
        });

        this.session_text = '';

        this.cognitive.on(LiveTranscriptionEvents.Open, () => {
            console.log('stt: connected to deepgram');

            this.cognitive.on(LiveTranscriptionEvents.Close, () => {
                console.log("stt: Connection closed.");
            });

            this.cognitive.on(LiveTranscriptionEvents.Transcript, (data) => {
                if (data.type === 'UtteranceEnd') {
                    if (!this.isFinal) {
                        console.log('STT: message is ' + this.session_text);
                        // this.callback(this.session_text)
                        this.emit('transcription', this.session_text);
                    }
                    return;
                }

                const text = data.channel.alternatives[0].transcript

                if (data.is_final === true && text.trim().length > 0) {
                    this.session_text += ` ${text}`;

                    if (data.speech_final === true) {
                        this.isFinal = true;
                        console.log('STT: message is ' + this.session_text);
                        // this.callback(this.session_text)
                        this.emit('transcription', this.session_text);

                        this.session_text = '';
                    } {
                        this.isFinal = false;
                    }
                } else if (text.length > 0) {
                    this.emit('talking', text)
                }
            });

            this.cognitive.on(LiveTranscriptionEvents.Metadata, (data) => {
                console.log(data);
            });

            this.cognitive.on(LiveTranscriptionEvents.Error, (err) => {
                console.error(err);
            });
        });

        console.log('stt: engine activated');
    }

    addChunk(data: string) {
        if (!this.cognitive)
            return;

        if (this.cognitive.getReadyState() == 0)
            return;

        this.cognitive.send(Buffer.from(data, "base64"));
    }

    disable() {
        this.cognitive.finish();
        this.cognitive.removeAllListeners();
    }
}