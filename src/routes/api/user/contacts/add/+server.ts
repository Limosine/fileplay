import type { RequestEvent, RequestHandler } from "./$types";


const generateCode = (deviceId: string, deviceSecret: string) => {
    return "Code";
}

export const POST: RequestHandler = async (event: RequestEvent) => {

    const {deviceId, deviceSecret} = await event.request.json();

    const generatedCode = generateCode(deviceId, deviceSecret);

    const body = JSON.stringify({code: generatedCode});

    return new Response(body, {
        headers: {

        }
    })
}
