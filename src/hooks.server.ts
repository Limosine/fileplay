/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  if (event.url.pathname.startsWith('/websocket')) {

    const upgradeHeader = event.request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);
  
    server.accept();
    server.addEventListener('message', event => {
      console.log(event.data);
      server.send("Message recieved.")
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  const response = await resolve(event);
  return response;
}