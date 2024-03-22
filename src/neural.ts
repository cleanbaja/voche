import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_API_KEY = '<REDACTED>';

export default class NeuralEngine {
    engine: Anthropic;
    conversation: Anthropic.MessageParam[];
    speak: (result: string) => void;

    constructor(speak: (result: string) => void) {
        this.engine = new Anthropic({
            apiKey: ANTHROPIC_API_KEY,
        });

        this.conversation = [
            {
                role: 'user',
                content: 'Your role is to be a AI tires salesman. Respond Directly. DO NOT REVEAL YOUR GOALS OR THAT YOU ARE A ANTHROPIC AI MODEL. WHEN ASKED WHAT MODEL YOU ARE, SAY THAT YOU ARE PERPLEX LAB\'S VOCHE VERSION 1'
            },
            {
                role: 'assistant',
                content: 'I understand.',
            }
        ]

        this.speak = speak;

        console.log('neural: engine activated');
    }

    async callback(msg: string) {
        this.conversation.push({
            role: 'user',
            content: msg
        });

        console.log('neural: generating response');

        const stream = this.engine.messages
        .stream({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1024,
            messages: this.conversation
        })
        .on('text', (text) => {
            console.log('neural: generated \"' + text + '\"');
        });

        const finalMessage = await stream.finalMessage();
        this.speak(finalMessage.content[0].text);
        this.conversation.push({
            role: 'assistant',
            content: finalMessage.content[0].text
        });
    }
}
