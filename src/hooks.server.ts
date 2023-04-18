import { redirect, type Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {

    const { cookies, fetch } = event;

    const name = cookies.get('name');

    console.log("Cookie", name);

    if (!name && event.url.pathname != "/name") {
        throw redirect(302, "/name");
    }

    return await resolve(event);

}