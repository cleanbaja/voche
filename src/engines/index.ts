/**
 * Represents a STT engine, that takes in a input audio stream in
 * either the MULAW-8k format (Twilio) or the PCM-16k format (Web)
 */
export interface Transcriber {
    /**
     * Processes a chunk of data into the STT
     * 
     * @param data piece of raw audio data
     */
    addChunk: (data: string | Buffer) => void,

    /**
     * Disables the Transcriber and releases contexts
     */
    disable: () => Promise<void>;
}

/**
 * Represents a TTS engine that takes in chunks of text
 * and ouputs audio data in MULAW-8k (web unsupported)
 */
export interface Synthesizer {
    /**
     * Disables the Synthesizer and releases contexts
     */
    disable: () => void;
}

/**
 * Packet of data sent to twilio
 */
export interface MediaPacket {
    event: string;
    streamSid: string;
    media: MediaData;
}
export interface MediaData {
    payload: string;
}