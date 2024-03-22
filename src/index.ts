import express, { Request, Response } from "express";
import expressWs from 'express-ws';
import * as fs from 'fs';

import STT from './transcribe';
import TTS from './synthesise';
import NeuralEngine from "./neural";

const { app } = expressWs(express());

const port = process.env.PORT || 8080;

app.post("/twiml", (req: Request, res: Response) => {
  console.log('main: twiml endpoint requested');

  res.setHeader('content-type', 'application/xml');
  res.send(fs.readFileSync('assets/streams.xml'));
});

app.ws("/receive", (ws, req) => {
  const ttsEngine = new TTS();
  const neuralEngine = new NeuralEngine(async (result) => { await ttsEngine.speak(result) });
  const sstEngine = new STT(async (msg) => { await neuralEngine.callback(msg) });

  ws.on('message', (rawmsg: string) => {
    const msg = JSON.parse(rawmsg);

    switch (msg.event) {
      case 'media':
        sstEngine.addChunk(msg.media.payload);
        break;

      case 'start':
        sstEngine.enable();
        ttsEngine.enable(msg.streamSid, (content) => { console.log('wow'); ws.send(content) });
        break;

      case 'stop':
        sstEngine.disable();
        break;

      default:
        console.log('socket: unknown message ' + msg.event);
        break;
    }
  });

  console.log('socket: connection activated');
});

app.listen(port, () => {
  console.log(`main: Server is running at http://localhost:${port}`);
});
