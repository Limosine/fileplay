import type { ServerLoadEvent } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({fetch}: ServerLoadEvent) => {
    const res = await fetch('/api/user/contacts/add', {
        method: "post",
        body: JSON.stringify({deviceId: "Hi", deviceSecret: "Hi"}),
        headers: {
            'content-type': 'application/json'
        }
    });

    const code = await res.json();

    return {
        code: code
    }
}