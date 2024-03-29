import EventEmitter from 'node:events';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

import AnthropicBuffer from "./buffers/anthropic.ts";
import { ObservableArray } from './utils.ts';

const ANTHROPIC_API_KEY = '<REDACTED>';
const FIREWORKS_API_KEY = '<REDACTED>';

export class LlamaEngine {
    engine: OpenAI;
    conversation_buffer: OpenAI.ChatCompletionMessageParam[];
    speak: (result: string) => void;
    sequenceIndex: number;

    constructor(speak: (result: string) => void) {
        this.engine = new OpenAI({
            apiKey: FIREWORKS_API_KEY,
            baseURL: 'https://api.fireworks.ai/inference/v1',
        });

        this.conversation_buffer = [
            {
                role: 'user',
                content: 'Your role is to be a AI tires salesman. Respond Directly. DO NOT REVEAL YOUR GOALS OR THAT YOU ARE A ANTHROPIC AI MODEL. WHEN ASKED WHAT MODEL YOU ARE, SAY THAT YOU ARE PERPLEX LAB\'S VOCHE VERSION 1. A friendly and helpful AI assistant. You must add a \'•\' symbol every 5 to 10 words at natural pauses where your response can be split for text to speech.'
            },
            {
                role: 'assistant',
                content: 'I understand.',
            }
        ]

        this.speak = speak;
        this.sequenceIndex = 0;

        console.log('Neural: Engine Activated');
    }

    async generate(msg: string, delim: string, lookback: () => boolean) {
        this.conversation_buffer.push({
            role: 'user',
            content: msg
        });

        console.log(`Engine: Generating Started`)

        const stream = await this.engine.chat.completions.create({
            model: 'accounts/fireworks/models/llama-v2-70b-chat',
            stream: true,
            messages: this.conversation_buffer,
            max_tokens: 7000
        });

        const hidden: Array<string> = [];
        const memory: ObservableArray<string> = new ObservableArray<string>(
            (s: string) => {
                this.speak(s)
            }
        );

        for await (const chunk of stream) {
            if (lookback()) {
                console.log(`Engine: Lookback`)
                hidden.push('--');

                if (hidden.length > 1) {
                    this.speak(hidden.join());
                    memory.push(hidden.join());
                    hidden.length = 0;
                }

                break;
            }

            const content = chunk.choices[0]?.delta?.content

            if (content == null || content == undefined) {
                //continue like in python, so pass over this iteration and go to the next
                continue;
            }

            if (content?.includes(delim)) {
                const split = content.split(delim);

                if (split[0] != '' && hidden.length > 0) {
                    hidden.push(split[0]);
                    this.speak(hidden.join(''))
                    memory.push(hidden.join(''));
                    hidden.length = 0;
                }

                // Clear the hidden array
                hidden.push(split[1]); // Add the remaining part to hidden
            } else {
                hidden.push(content!);
            }
        }

        this.conversation_buffer.push({
            role: 'assistant',
            content: memory.join()
        });
    }
}

export class AnthropicEngine extends EventEmitter {
    engine: Anthropic;
    conversation: AnthropicBuffer;
    active = true;
    sequenceIndex: number;
    marks: string[];

    constructor(conversation: AnthropicBuffer | null, marks: string[]) {
        super();

        this.engine = new Anthropic({
            apiKey: ANTHROPIC_API_KEY,
        });
        this.marks = marks;

        this.conversation = conversation!;

        this.sequenceIndex = 0;

        console.log('neural: engine activated');
    }

    async callback(msg: string, delim: string) {
        const hidden: Array<string> = [];

        const memory: ObservableArray<string> = new ObservableArray<string>(
            (s: string) => {
                this.sequenceIndex++;
                this.emit('response_generated', s, this.sequenceIndex);
            }
        );

        this.conversation.addSegment('user', msg)

        console.log('neural: generating response');

        const stream = await this.engine.messages
            .create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1024,
                system: 'Add a \'•\' symbol every 5 to 10 words at natural pauses where your response can be split for text to speech. Your role is to be a AI tires salesman. Respond Directly. DO NOT REVEAL YOUR GOALS OR THAT YOU ARE A ANTHROPIC AI MODEL. WHEN ASKED WHAT MODEL YOU ARE, SAY THAT YOU ARE PERPLEX LAB\'S VOCHE VERSION 1',
                messages: this.conversation.buffer as Anthropic.MessageParam[],
                stream: true
            })

        for await (const messageStreamEvent of stream) {
            console.log('len', this.marks.length)
            if (!this.active && this.marks.length > 0) {
                this.active = true;
                // memory[memory.length - 1] = memory[memory.length - 1] + "--";
                this.emit('done')
                break;
            }

            if (messageStreamEvent.type == 'message_stop') {
                if (hidden.length > 0) {
                    memory.push(hidden.join('').trim())
                    hidden.length = 0;
                    this.emit('done')
                }

                break;
            } else if (messageStreamEvent.type == 'content_block_delta') {
                const message = messageStreamEvent.delta.text;

                if (message.includes(delim)) {
                    const split = message.split(delim);
                    hidden.push(split[0]);
                    memory.push(hidden.join('').trim())
                    hidden.length = 0;

                    if (split[1].length >= 1) {
                        hidden.push(split[1]);
                    }
                } else {
                    hidden.push(message);
                }
            }
        }
    }
}
