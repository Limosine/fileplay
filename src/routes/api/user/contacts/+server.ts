export async function GET() {
  let contacts = generateContacts(100, 5);
  return new Response(JSON.stringify(contacts), {status: 200});
}

function makeid(length: number) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

function generateContacts(count: number, length: number) {
  let contacts = [];
  for (let i = 0; i < count; i++) {
    contacts.push({name: makeid(length)});
  }
  return contacts;
}