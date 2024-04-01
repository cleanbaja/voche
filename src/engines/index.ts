import { Buffer } from 'node:buffer'

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
 * Represents a Neural engine that takes in chunks of text
 * and ouputs more chunks of text :^)
 */
export interface Neural {
    /**
     * Disables the Neural Engine and releases contexts
     */
    disable: () => void;
}