import { AnthropicEngine } from "./neural.ts";
import Stream from "./stream.ts";
import Synthesizer from "./synthesise.ts";
import Transcriber from "./transcribe.ts";

export default class CallManager {
  transcriber: Transcriber;
  engine: AnthropicEngine;
  synthesizer: Synthesizer;
  stream: Stream;
  marks: string[];
  streamSid: string;

  constructor(ws: WebSocket) {
    this.streamSid = "";
    this.marks = [];

    this.transcriber = new Transcriber();
    this.engine = new AnthropicEngine(this.transcriber, this.marks);
    this.synthesizer = new Synthesizer();
    
    this.stream = new Stream(ws);
    this.setEventHandlers();
  }

  private setEventHandlers() {
    this.transcriber.on("transcription", async (text) => {
      await this.engine.callback(text, "•");
    });

    this.transcriber.on("clear", () => {
      console.log("Clearing Stream!");
      this.stream?.sendClear();
      this.engine.marks = [""];
    });

    this.engine.on("response_generated", async (text, id) => {
      await this.synthesizer.speak(text, id);
    });

    this.synthesizer.on("audio_packet", async (packet, id) => {
      await this.stream?.buffer(id, packet);
    });

    this.stream?.on("audiosent", async (chunkId) => {
      await this.marks.push(chunkId);
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
