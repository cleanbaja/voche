import { AnthropicEngine } from "./neural.ts";
import Stream from "./stream.ts";
import Synthesizer from "./synthesise.ts";
import Transcriber from "./transcribe.ts";

import AnthropicBuffer from "./buffers/anthropic.ts";


export default class CallManager {
  transcriber: Transcriber;
  engine: AnthropicEngine;
  synthesizer: Synthesizer;
  conversation_buffer: AnthropicBuffer;
  stream: Stream;
  marks: string[];
  streamSid: string;

  constructor(ws: WebSocket) {
    this.streamSid = "";
    this.marks = [];
    this.conversation_buffer = new AnthropicBuffer([]);

    this.transcriber = new Transcriber();
    this.engine = new AnthropicEngine(this.conversation_buffer, this.marks);
    this.synthesizer = new Synthesizer();
    
    this.stream = new Stream(ws);
    this.setEventHandlers();
  }

  private setEventHandlers() {
    this.transcriber.on("transcription", async (text) => {
      await this.engine.callback(text, "•");
    });

    this.transcriber.on("talking", () => {
      if (this.marks.length > 0) {
        this.stream?.sendClear();
        this.marks = []
        this.engine.active = false;
      }
    });

    this.engine.on("response_generated", async (text, id) => {
      await this.synthesizer.speak(text, id);
    });

    this.engine.on("done", async () => {
      console.log('reached how many times')
      if (this.conversation_buffer._memory.assistant != '') {
        this.conversation_buffer._memory.assistant = '*Empty Content*'
      }
      this.conversation_buffer.addSegment('assistant', this.conversation_buffer._memory.assistant);
      this.conversation_buffer._memory.assistant = '';
    });

    this.synthesizer.on("audio_packet", async (packet, id, text) => {
      await this.stream?.buffer(id, packet, text);
    });

    this.stream?.on("audiosent", async (chunkId, text) => {
      await this.marks.push(chunkId);
      this.conversation_buffer.addMemory('assistant', text);
    });
  }

  handleMessage(data: string) {
    const msg = JSON.parse(data);

    switch (msg.event) {
      case "media":
        this.transcriber.addChunk(msg.media.payload);
        break;

      case "start":
        this.synthesizer.enable(msg.streamSid);
        this.stream.setStreamSid(msg.streamSid);
        break;

    case "mark":
        console.log(`Twilio -> Audio completed mark (${msg.sequenceNumber}): ${msg.mark.name}`);
        this.marks = this.marks.filter((m) => m !== msg.mark.name);
        break;

      case "stop":
        this.transcriber.disable();
        break;

      default:
        console.log("Socket: Unknown Message = " + msg.event);
        break;
    }
  }
}
