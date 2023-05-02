import { db } from "$lib/server/db";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
    return {
        contacts: db.getDummyContacts(),
    }
}