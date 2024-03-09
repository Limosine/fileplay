export const onRequest = async function onRequest({ request, env }) {
  try {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api")) {
      const newUrl = new URL(request.url);

      const host =
        env.PUBLIC_HOSTNAME !== undefined &&
        env.PUBLIC_HOSTNAME.startsWith("dev")
          ? "https://api-dev.fileplay.me"
          : "https://api.fileplay.me";

      newUrl.host = new URL(host).host;
      const modifiedRequest = new Request(newUrl, request);
      modifiedRequest.headers.set(
        "x-request-ip",
        request.headers.get("x-real-ip"),
      );
      return fetch(modifiedRequest);
    }
    return await context.next();
  } catch (e) {
    return await context.next();
  }
};
