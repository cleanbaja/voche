import { isBun, isDeno, isNode } from "./util/runtime.ts";
import { NGROK_URL } from "./util/env.ts";
import Manager from "./manager.ts";
import type { Platform } from "./platform/index.ts";
import { Twilio } from "./platform/twilio.ts";

const rawfile = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://@NGROK_URL@/receive"></Stream>
  </Connect>
  <Hangup/>
</Response>`;

const config = rawfile.replace('@NGROK_URL@', NGROK_URL);

if (isBun) {
    Bun.serve<Manager>({
        fetch(req, server) {
            const url = new URL(req.url);

            if (url.pathname === "/receive") {
                if (req.headers.get("upgrade") != "websocket") {
                    return new Response(null, { status: 501 });
                }

                if (server.upgrade(req, { data: new Manager(new Twilio()) })) {
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
            },
            message(ws, message) {
                const msg = JSON.parse(String(message));

                if (msg.event === 'start')
                    ws.data?.eventbus.emit('manager:active', msg.streamSid);

                if (msg.event === 'media')
                    ws.data?.stt.addChunk(message);
            }
        },
        port: 3000,
    });
} else if (isDeno) {
    Deno.serve({ port: 3000 }, (req) => {
        const url = new URL(req.url);

        const setupWebSocket = (plat: Platform) => {
            if (req.headers.get("upgrade") != "websocket") {
                return new Response(null, { status: 501 });
            }

            const { socket, response } = Deno.upgradeWebSocket(req);

            const manager = new Manager(plat);

            // listen for completed audio chunks from tts
            manager.eventbus.on('tts:data', (data: any) => {
                console.log('sending data');
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
            return setupWebSocket(new Twilio())
        }

        return new Response(null, { status: 404 });
    });
} else {
    console.error('error: runtime is not supported!')
}
