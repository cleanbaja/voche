import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { WaveFile } from 'wavefile';
import { TwilioPacket, MediaEvent } from "./utils";

const SPEECH_KEY = '7a1a2d11bc9b4078876a1d2a65c1a31b';
const SPEECH_REIGON = 'eastus';

export default class TTS {
    sid: string | null;
    engine: sdk.SpeechSynthesizer;
    callback: (content: string) => void;

    constructor() {
        const config = sdk.SpeechConfig.fromSubscription(SPEECH_KEY, SPEECH_REIGON);
        config.speechSynthesisVoiceName = "en-US-AvaMultilingualNeural";
        config.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm;

        this.engine = new sdk.SpeechSynthesizer(config);

        this.sid = null;
        this.callback = () => {};
    }

    enable(sid: string, callback: (content: string) => void) {
        this.sid = sid;
        this.callback = callback;

        console.log("tts: engine enabled");
    }

    speak(chunk: string) {
        console.log('tts: speaking');

        this.engine.speakTextAsync(
            chunk,
            result => {
                const { audioData } = result;

                this.callback(this.encode(audioData));
            },
            error => {
                console.log(error);
                this.engine.close();
            });
    }

    private transform(raw: ArrayBuffer) {
        const wav = new WaveFile(new Uint8Array(raw));

        wav.toMuLaw();
        return wav.toBase64();
    }

    private encode(raw: ArrayBuffer) {
        let packet = new TwilioPacket(this.sid as string, 'media');
        packet.media = {
            payload: this.transform(raw)
        };

        console.log('tts: just encoded packet...');
        console.log(packet);

        return JSON.stringify(packet);
    }
}