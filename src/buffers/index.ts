import Anthropic from '@anthropic-ai/sdk';
import EventEmitter from 'node:events';
import OpenAI from 'openai';

export class _Buffer extends EventEmitter {
    buffer: Anthropic.MessageParam[] | OpenAI.ChatCompletionMessageParam[] | null;

    _memory: {
        assistant: string;
        user: string;
        system: string;
    }; 

    constructor() {
        super();
        this.buffer = null;

        this._memory = {
            assistant: '',
            user: '',
            system: ''
        }
    }

    addSegment(type: 'assistant' | 'user', segment: string) {
        this.buffer?.push({
            role: type ,
            content: segment
        })

        console.log(this.buffer)
    }
}