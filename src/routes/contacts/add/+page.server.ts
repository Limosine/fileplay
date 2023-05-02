import type { ServerLoadEvent } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({fetch}: ServerLoadEvent) => {
    const code = await fetch('/api/contacts/add', {
        method: "get",
        body: JSON.stringify({deviceId: "", deviceSecret: ""}),
        headers: {
            'content-type': 'application/json'
        }
    });

    return {
        code: code
    }
}