export const onRequest = async (context) => {
  const request = context.request;
  try {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api")) {
      const newUrl = new URL(request.url);
      newUrl.host = new URL("https://api.fileplay.me").host;
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
