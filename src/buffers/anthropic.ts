import Anthropic from "@anthropic-ai/sdk";
import { _Buffer } from "./index.ts";


export default class AnthropicBuffer extends _Buffer {
    current_index: number = 0;
    block: number = 0;

    constructor(buffer: Anthropic.MessageParam[]) {
        super();
        this.buffer = buffer;
    }

    addMemory(type: "assistant" | "user", segment: string): void {
        this.current_index++;
        this._memory[type] += segment;
    }

    checkSequence() {
        let expectedRole: 'user' | 'assistant' = 'user';

        for (const { role } of this.buffer!) {
            if (role !== expectedRole) {
            return false;
            }

            expectedRole = expectedRole === 'user' ? 'assistant' : 'user';
        }

        return true;
    }

    // this.on('')


}