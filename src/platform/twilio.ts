import { type Encoding, type Platform } from './index.ts';
import { Buffer } from 'node:buffer';

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


export class Twilio implements Platform {
    sid?: string;

    hasContainer(input: boolean) {
        return false;
    }

    getInputAudioFormat() {
        return {
            encoding: 'mulaw' as Encoding,
            sample_rate: 8000,
            container: 'none'
        };
    };

    getOutputAudioFormat() {
        // twilio uses 1 format for both input/output
        return this.getInputAudioFormat();
    }

    /**
     * Converts the raw audio data into a format suitable
     * for transmission back to the host...
     * 
     * @param raw raw audio data as a buffer
     */
    encode(raw: Uint8Array) {
        if (!this.sid)
            return "";

        let packet: MediaPacket = {
            event: 'media',
            streamSid: this.sid,
            media: {
                payload: Buffer.from(raw).toString('base64')
            }
        }

        return JSON.stringify(packet);
    }

    /** 
     * Consumes a input packet and processes it,
     * returning raw data for the STT
     *
     * @param event message event passed in from socket
     */
    decode(event: MessageEvent<any>) {
        const msg = JSON.parse(event.data);

        if (msg.event === 'start') {
            this.sid = msg.streamSid;
            return false;
        }

        if (msg.event === 'media')
            return Buffer.from(msg.media.payload, 'base64');
        
        return false;
    }
}