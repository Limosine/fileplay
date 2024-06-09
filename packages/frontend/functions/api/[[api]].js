export function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    if (url.pathname.startsWith("/api")) {
      const host = context.env.API_HOSTNAME;
      if (!host) throw new Error("Undefined environment variable");

      const newUrl = new URL(context.request.url);

      newUrl.host = new URL(`https://${host}`).host;
      newUrl.pathname = url.pathname.replace("/api", "");

      const modifiedRequest = new Request(newUrl, context.request);
      modifiedRequest.headers.set(
        "x-request-ip",
        context.request.headers.get("x-real-ip"),
      );
      return fetch(modifiedRequest);
    }
    return context.next();
  } catch (e) {
    console.log(e);
    return context.next();
  }
}
