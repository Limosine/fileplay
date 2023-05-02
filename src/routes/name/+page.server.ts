import { fail, redirect } from '@sveltejs/kit';
import type { Actions, RequestEvent } from './$types';

export const actions: Actions = {
    submit: async (event: RequestEvent) => {
        const { cookies, request } = event;
        const data = await request.formData();

        const name: string | undefined = data.get('name')?.toString();

        if (name) {
            cookies.set('name', name, {
                httpOnly: false,
                path: "/",
                sameSite: "strict",
                secure: true
            })
            throw redirect(302, "/");
        }
    }
}