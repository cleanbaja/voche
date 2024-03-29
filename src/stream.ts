import EventEmitter from 'node:events';
import { Buffer } from 'node:buffer';
import { v4 as uuidv4 } from 'uuid';

export default class Stream extends EventEmitter {
    ws: WebSocket;
    audioBuffer: { [index: number]: [Buffer, string] };
    streamSid: string | null;
    expectedAudioIndex: number;

    constructor(ws: WebSocket) {
        super();
        this.ws = ws;
        this.expectedAudioIndex = 1;
        this.audioBuffer = {};
        this.streamSid = '';
    }

    setStreamSid(streamSid: string) {
        this.streamSid = streamSid;
    }

    buffer(index: number, audio: Buffer, text: string) {
        // Escape hatch for intro message, which doesn't have an index
        if (index === null) {
            this.sendAudio(audio, text);
        } else if (index === this.expectedAudioIndex) {
            this.sendAudio(audio, text);
            this.expectedAudioIndex++;

            while (Object.prototype.hasOwnProperty.call(this.audioBuffer, this.expectedAudioIndex)) {
                const bufferedAudio = this.audioBuffer[this.expectedAudioIndex];
                this.sendAudio(bufferedAudio[0], bufferedAudio[1]);
                this.expectedAudioIndex++;
            }
        } else {
            this.audioBuffer[index] = [audio, text];
        }
    }

    sendMark(text: string) {
        const markLabel = uuidv4();

        this.ws.send(
            JSON.stringify({
                streamSid: this.streamSid,
                event: 'mark',
                mark: {
                    name: markLabel
                }
            })
        );

        this.emit('audiosent', markLabel, text);
    }

    sendAudio(audio: Buffer, text: string) {
        this.ws.send(
            JSON.stringify({
                streamSid: this.streamSid,
                event: 'media',
                media: {
                    payload: audio,
                },
            })
        );

        // When the media completes you will receive a `mark` message with the label
        this.sendMark(text);
    }

    sendClear() {
        this.ws.send(JSON.stringify({
            event: 'clear',
            streamSid: this.streamSid
        }))
    }
}