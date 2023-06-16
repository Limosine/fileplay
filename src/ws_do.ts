interface Env {
  DATABASE: D1Database;
}

export class MessageWebSocketHibernation {
  state: DurableObjectState;
  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }
  async fetch(request: Request) {
    const isUpgrade = request.headers.get("Upgrade") === "websocket";
    if (isUpgrade) {
      // To accept the WebSocket request, we create a WebSocketPair (which is like a socketpair,
      // i.e. two WebSockets that talk to each other), we return one end of the pair in the
      // response, and we operate on the other end. Note that this API is not part of the
      // Fetch API standard; unfortunately, the Fetch API / Service Workers specs do not define
      // any way to act as a WebSocket server today.
      const searchParams = new URL(request.url).searchParams;
      const did = searchParams.get("did") as string;
      const uid = searchParams.get("uid") as string;
      this.state.storage.put("did", parseInt(did));
      this.state.storage.put("uid", parseInt(uid));

      let pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      // We're going to take pair[1] as our end, and return pair[0] to the client.
      // socket.accept analogue in Durable Objects Hibernate API
      this.state.acceptWebSocket(server);

      // Now we return the other end of the pair to the client.
      return new Response(null, { status: 101, webSocket: client });
    } else {
      const ws = this.state.getWebSockets()[0];
      if (ws) {
        ws.send(await request.text());
      }
    }
  }

  async clearWebSocketId() {
    await this.env.DATABASE.batch([
      this.env.DATABASE.prepare(
        "update devices set websocketId = null where did = ?1"
      ).bind(this.state.storage.get("did")),
      this.env.DATABASE.prepare(
        "update users set webSocketId = null where uid = ?1"
      ).bind(this.state.storage.get("uid")),
    ]);
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean
  ) {
    await this.clearWebSocketId();
  }

  async webSocketError(ws: WebSocket, error: any) {
    await this.clearWebSocketId();
  }
}
