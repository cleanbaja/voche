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

let config: string | null;

Deno.serve({ port: 3000 }, (req) => {
  const url = new URL(req.url);

  if (!config) {
    console.log(url);
    config = rawfile.replace("@NGROK_URL@", url.hostname);
  }

  const setupWebSocket = (plat: Platform) => {
    if (req.headers.get("upgrade") != "websocket") {
      return new Response(null, { status: 501 });
    }

    const { socket, response } = Deno.upgradeWebSocket(req);

    const manager = new Manager(plat);

    // listen for completed audio chunks from tts
    manager.eventbus.on("tts:data", (data: string) => {
      socket.send(data);
    });

    socket.addEventListener(
      "message",
      (ev: MessageEvent) => manager.handleEvent(ev),
    );

    socket.addEventListener("close", async () => {
      await manager.shutdown();
    });

    return response;
  };

  if (url.pathname === "/twiml") {
    return new Response(config, {
      headers: {
        "Content-Type": "application/xml",
      },
    });

  } else if (url.pathname === "/receive") {
    return setupWebSocket(new Twilio());
  }

  return new Response(null, { status: 404 });
});
