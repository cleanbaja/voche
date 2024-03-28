import CallManager from "./manager.ts";
import { isBun, isDeno, isNode } from "./utils.ts";

if (isDeno) {
  Deno.serve((req) => {
    const url = new URL(req.url);

    if (url.pathname === "/receive") {
      if (req.headers.get("upgrade") != "websocket") {
        return new Response(null, { status: 501 });
      }

      const { socket, response } = Deno.upgradeWebSocket(req);

      const manager = new CallManager(socket);

      socket.addEventListener("message", (event) => {
        manager.handleMessage(event.data);
      });

      return response;
    } else if (url.pathname === "/twiml") {
      return new Response(Deno.readTextFileSync("./assets/streams.xml"));
    }

    return new Response(null, { status: 404 });
  });
} else if (isBun) {
  Bun.serve<CallManager | null>({
    fetch(req, server) {
      const url = new URL(req.url);

      if (url.pathname === "/receive") {
        if (req.headers.get("upgrade") != "websocket") {
          return new Response(null, { status: 501 });
        }

        if (server.upgrade(req, { data: null } )) {
          return;
        }

        return new Response(null, { status: 500 });
      } else if (url.pathname === "/twiml") {
        return new Response(Bun.file("./assets/streams.xml"));
      }

      return new Response(null, { status: 404 });
    },
    websocket: {
      open(ws) {
        console.log('server: connecting to socket...');
        ws.data = new CallManager(ws);
      },
      message(ws, message) {
        console.log('server: message recv\'d');
        ws.data?.handleMessage(String(message));
      }
    }
  });
} else if (isNode) {
  console.error('error: runtime is not supported!')
}
