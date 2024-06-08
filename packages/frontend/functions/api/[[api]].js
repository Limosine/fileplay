export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    if (url.pathname.startsWith("/api")) {
      const newUrl = new URL(context.request.url);

      const host =
        context.env.PUBLIC_HOSTNAME == "dev.fileplay.me"
          ? "https://api-dev.fileplay.me"
          : "https://api.fileplay.me";

      newUrl.host = new URL(host).host;
      const modifiedRequest = new Request(newUrl, context.request);
      modifiedRequest.headers.set(
        "x-request-ip",
        context.request.headers.get("x-real-ip"),
      );
      return fetch(modifiedRequest);
    }
    return await context.next();
  } catch (e) {
    return await context.next();
  }
}
