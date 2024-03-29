import { DeepgramSTT } from "./engines/deepgram.ts";
import { isBun, isDeno, isNode } from "./util/runtime.ts";
import { NGROK_URL } from "./util/env.ts";
import Manager from "./manager.ts";

const rawfile = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>This is a Confidential Trial of automated software from Perplex Labs. All Rights Reserved. Starting call now.</Say>
  <Connect>
    <Stream url="wss://@NGROK_URL@/receive"></Stream>
  </Connect>
  <Hangup/>
</Response>`;

const config = rawfile.replace('@NGROK_URL@', NGROK_URL);

if (isBun) {
    Bun.serve<DeepgramSTT | null>({
        fetch(req, server) {
            const url = new URL(req.url);

            if (url.pathname === "/receive") {
                if (req.headers.get("upgrade") != "websocket") {
                    return new Response(null, { status: 501 });
                }

                if (server.upgrade(req, { data: null })) {
                    return;
                }

                return new Response(null, { status: 500 });
            } else if (url.pathname === "/twiml") {
                return new Response(config, {
                    headers: {
                        'Content-Type': 'application/xml'
                    }
                });
            }

            return new Response(null, { status: 404 });
        },
        websocket: {
            open(ws) {
                console.log('server: connecting to socket...');

                // @ts-ignore
                ws.data = new DeepgramSTT();
            },
            message(ws, message) {
                const msg = JSON.parse(String(message));

                if (msg.event === 'media')
                    ws.data?.addChunk(msg.media.payload);
            }
        },
        port: 3000,
    });
} else if (isDeno) {
    Deno.serve({ port: 3000 }, (req) => {
        const url = new URL(req.url);

        const setupWebSocket = (plat: string) => {
            if (req.headers.get("upgrade") != "websocket") {
                return new Response(null, { status: 501 });
            }

            const { socket, response } = Deno.upgradeWebSocket(req);

            const manager = new Manager(plat);

            // listen for completed audio chunks from tts
            manager.eventbus.on('tts:data', (data: any) => {
                socket.send(data);
            })

            socket.addEventListener("message", async (ev: MessageEvent<any>) => await manager.handleEvent(ev));

            socket.addEventListener("close", async () => {
                await manager.shutdown();
            });

            return response;
        };

        if (url.pathname === "/twiml") {
            return new Response(config, {
                headers: {
                    'Content-Type': 'application/xml'
                }
            });
        } else if (url.pathname === "/receive") {
            return setupWebSocket('twilio')
        } else if (url.pathname === "/receive-web") {
            return setupWebSocket('web');
        }

        return new Response(null, { status: 404 });
    });
} else {
    console.error('error: runtime is not supported!')
}
