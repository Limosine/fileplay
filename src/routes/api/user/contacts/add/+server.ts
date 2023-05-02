import type { RequestEvent, RequestHandler } from "./$types";

export const GET: RequestHandler = async (event: RequestEvent) => {

    const {deviceId, deviceSecret} = await event.request.json();

    const generatedCode = generateCode(deviceId, deviceSecret);



    return new Response(JSON.stringify(generateCode), {
        headers: {
            
        }
    })
}

const generateCode = async (deviceId: string, deviceSecret: string) => {
    return "Code";
}