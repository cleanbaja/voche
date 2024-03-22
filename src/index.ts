import express, { Request, Response } from "express";
import expressWs from 'express-ws';
import * as fs from 'fs';

import TTS from './transcribe';

const { app } = expressWs(express());

const port = process.env.PORT || 8080;

app.post("/twiml", (req: Request, res: Response) => {
  console.log('twiml: endpoint requested');

  res.setHeader('content-type', 'application/xml');
  res.send(fs.readFileSync('assets/streams.xml'));
});

app.ws("/receive", (ws, req) => {
  const ttsEngine = new TTS((msg) => {});

  ws.on('message', (rawmsg: string) => {
    const msg = JSON.parse(rawmsg);

    switch (msg.event) {
      case 'media':
        ttsEngine.addChunk(msg.media.payload);
        break;

      case 'start':
        ttsEngine.enable();
        break;

      case 'stop':
        ttsEngine.disable();
        break;

      default:
        console.log('socket: unknown message ' + msg.event);
        break;
    }
  });

  console.log('socket: connection activated');
});

app.listen(port, () => {
  console.log(`[main]: Server is running at http://localhost:${port}`);
});

/*
const openai = new OpenAI({
	//apiKey: 'VGdvrBAp56gaYvcN7hMVsrGMzWfwwoXgY6KLWG4qGYQYkhnk',
  apiKey: 'bwdjSgC3kcaQXbnVdnd6FuBQqvVTwF6SsuxydPY3if8Aslvk',
	baseURL: 'https://api.fireworks.ai/inference/v1/chat/completions'
});
*/

