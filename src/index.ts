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
        manager.handleMessage(event);
      });

      return response;
    } else if (url.pathname === "/twiml") {
      return new Response(Deno.readTextFileSync("./assets/streams.xml"));
    }

    return new Response("404!");
  });
} else if (isBun || isNode) {
  console.error('error: runtime is not supported!')
}
