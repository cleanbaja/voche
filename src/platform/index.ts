import { Buffer } from 'node:buffer';

/**
 * Encoding types supported by providers
 */
export type Encoding = "linear16" | "mulaw" | "alaw" | "mp3" | "opus" | "flac" | "aac" | undefined;

/**
 * Format of audio packets used by Voche.
 */
export type AudioFormat = {
    encoding: Encoding;
    container: string;
    sample_rate: number;
};

/**
 * ## Platform
 * 
 * A platform is a wrapper over voche, controlling and interpretting
 * the data sent over the websocket...
 * 
 * Voche currently supports 2 platforms, which are the twilio
 * platform for voice calls, and the web platform. Further
 * data on both is as follows:
 * 
 * ### Twilio
 * 
 * Twilio communicates with voche over a websocket connection,
 * which is acquired through the twiml endpoint, which returns a
 * XML document detailing the location of the websocket and further
 * metadata. Twilio then sends multiple packets over the websocket,
 * indicating either a start of communication, media data, or a "mark"
 * 
 * As for the data format, Twilio sends 8k u-law data, encoded in base64
 * and transfered in 20ms chunks...
 * 
 * ### Web
 * 
 * The Web platform uses the HTML5 MediaRecorder to collect data on
 * the client side, before sending it over to Voche in 16k PCM, with
 * each packet containing 50ms chunks...
 * 
 */
export interface Platform {
    /**
     * Returns whether the platform's input/output audio is encoded in a container
     * 
     * @param input are we talking about input audio or output?
     */
    hasContainer: (input: boolean) => boolean;

    /**
     * Returns the audio format of the input stream
     */
    getInputAudioFormat: () => AudioFormat;

    /**
     * Returns the audio format of the output stream
     */
    getOutputAudioFormat: () => AudioFormat;

    /**
     * Converts the raw audio data into a format suitable
     * for transmission back to the host...
     * 
     * @param raw raw audio data as a buffer
     */
    encode: (raw: Uint8Array) => string;

    /** 
     * Consumes a input packet and processes it,
     * returning raw data for the STT
     *
     * @param event message event passed in from socket
     */
    decode: (event: MessageEvent<any>) => string | Buffer | boolean;
}