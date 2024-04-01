import { EventEmitter } from "tseep";
import { Mutex } from "semaphore";
import OpenAI from "openai";

import { Neural } from "./index.ts";
import { createLogger } from "../util/logger.ts";
import { NeuralProfiler } from "../util/profiler.ts";

const logger = createLogger('groq');

export class Groq implements Neural {
    engine: OpenAI;
    conversation: OpenAI.ChatCompletionMessageParam[];
    mutex: Mutex;
    profiler: NeuralProfiler;

    constructor(bus: EventEmitter) {
        this.mutex = new Mutex();
        this.profiler = new NeuralProfiler();

        this.engine = new OpenAI({
            apiKey: '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',
            baseURL: 'https://api.groq.com/openai/v1'
        });

        this.conversation = [
            {
                role: 'user',
                content: 'Your role is to be a AI tires salesman.'
            },
            {
                role: 'assistant',
                content: 'I understand.',
            }
        ]

        bus.on("stt:data", async (data: string) => {
            await this.generateText(data, bus);
        });
    }

    private async generateText(data: string, bus: EventEmitter) {
        const release = await this.mutex.acquire();

        this.conversation.push({
            role: 'user',
            content: data
        });

        this.profiler.signalStart();

        const response = await this.engine.chat.completions.create({
            model: "llama2-70b-4096",
            stream: false,
            messages: this.conversation,
            max_tokens: 50
        });

        this.profiler.signalEnd();

        const text = response.choices[0].message.content;

        bus.emit('neural:data', text);

        this.conversation.push({
            role: 'assistant',
            content: text
        });

        release();
    }

    disable() { }
}