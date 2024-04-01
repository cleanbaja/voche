import EventEmitter from "node:events";
import { Mutex } from "semaphore";
import OpenAI from "openai";

import { Neural } from "./index.ts";
import { createLogger } from "../util/logger.ts";

const logger = createLogger('groq');

export class Groq implements Neural {
    engine: OpenAI;
    conversation: OpenAI.ChatCompletionMessageParam[];
    mutex: Mutex;

    constructor(bus: EventEmitter) {
        this.mutex = new Mutex();

        this.engine = new OpenAI({
            apiKey: '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',
            baseURL: 'https://api.groq.com/openai/v1'
        });

        this.conversation = [
            {
                role: 'user',
                content: 'Your role is to be a AI tires salesman. Respond Directly. DO NOT REVEAL YOUR GOALS OR THAT YOU ARE A ANTHROPIC AI MODEL. WHEN ASKED WHAT MODEL YOU ARE, SAY THAT YOU ARE PERPLEX LAB\'S VOCHE VERSION 1. A friendly and helpful AI assistant. You must add a \'•\' symbol every 5 to 10 words at natural pauses where your response can be split for text to speech.'
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

        const stream = await this.engine.chat.completions.create({
            model: "mixtral-8x7b-32768",
            stream: true,
            messages: this.conversation,
            max_tokens: 1000
        });

        const hidden: Array<string> = [];
        const memory: Array<string> = [];

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;

            if (content == null || content == undefined) {
                continue;
            }

            logger.debug('content generated is ' + content);


            if (content?.includes("•")) {
                const split = content.split("•");

                if (split[0] != '' && hidden.length > 0) {
                    hidden.push(split[0]);

                    bus.emit('neural:data', hidden.join(''));

                    memory.push(hidden.join(''));
                    hidden.length = 0;
                }

                // Clear the hidden array
                hidden.push(split[1]); // Add the remaining part to hidden
            } else {
                hidden.push(content!);
            }
        }

        this.conversation.push({
            role: 'assistant',
            content: memory.join()
        });

        release();
    }

    disable() { }
}