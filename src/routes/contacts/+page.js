export async function load({ fetch }) {
    const res = await fetch("/api/user/contacts");
    const data = await res.json();

    if (res.ok) {
        return {
            contacts: data,
        }
    }

    return {
        status: res.status,
        error: new Error("Could not fetch contacts")
    }
}