import * as sdk from "microsoft-cognitiveservices-speech-sdk";

const SPEECH_KEY = '7a1a2d11bc9b4078876a1d2a65c1a31b';
const SPEECH_REIGON = 'eastus';

export default class SST {
    stream: sdk.PushAudioInputStream;
    audioConfig: sdk.AudioConfig;
    cognitive: sdk.SpeechRecognizer;
    callback: (result: string) => Promise<void>;
    active: boolean = false;

    constructor(callback: (result: string) => Promise<void>) {
        const config = sdk.SpeechConfig.fromSubscription(SPEECH_KEY, SPEECH_REIGON);
        const slconfig = sdk.AutoDetectSourceLanguageConfig.fromLanguages(['en-US']);

        config.setProperty(sdk.PropertyId.Speech_SegmentationSilenceTimeoutMs, "1000");
        config.setProfanity(sdk.ProfanityOption.Raw);

        const format = sdk.AudioStreamFormat.getWaveFormat(8000, 8, 1, sdk.AudioFormatTag.MuLaw);

        this.stream = sdk.AudioInputStream.createPushStream(format)
        this.audioConfig = sdk.AudioConfig.fromStreamInput(this.stream);
        this.callback = callback;

        this.cognitive = sdk.SpeechRecognizer.FromConfig(config, slconfig, this.audioConfig);
        this.setCallbacks();

        console.log('sst: engine activated');
    }

    setCallbacks() {
        this.cognitive.sessionStopped = (sender, event) => {
            console.log('sst: session stopped');
        };

        this.cognitive.sessionStarted = (sender, event) => {
            console.log('sst: session started');
        };

        this.cognitive.canceled = (sender, event) => {
            console.log(`sst: Canceled with Reason=${event.reason}`);

            if (event.reason == sdk.CancellationReason.Error) {
                console.log(`sst: [CANCELED] ErrorCode=${event.errorCode}`);
                console.log(`sst: [CANCELED] ErrorDetails=${event.errorDetails}`);
                console.log("sst: Did you set the speech resource key and region values?");
            }
        };

        this.cognitive.recognizing = (sender, event) => {
            if (!this.active) {
                //console.log('sst: utterance: ');
                //console.log(event);
                this.active = true;
            }
        };

        this.cognitive.recognized = async (sender, event) => {
            this.active = false;
            // console.log('sst: result=\"' + event.result.text + "\"");

            if (event.result.text != undefined)
                await this.callback(event.result.text);
        };
    }

    addChunk(data: string) {
        const buffer = Buffer.from(data, 'base64');
        this.stream.write(buffer);
    }

    enable() {
        this.cognitive.startContinuousRecognitionAsync();
    }

    disable() {
        this.stream.close();
        this.cognitive.stopContinuousRecognitionAsync();
        console.log('sst: engine shutdown');
    }
}