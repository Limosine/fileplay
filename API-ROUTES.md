# API Routes

## Devices

| verb | endpoint | payload | return | description |
| --- | --- | --- | --- | --- |
| GET | `/devices` | cookies: `device id`, `device secret` | List of all devices connected to persona | List all devices linked to the persona the requesting device is linked to.
| REMOVE | `/devices` | cookies: `device id`, `device secret`; `device id` to remove | | Remove a device from the persona the requesting device is linked to. At next connection from this device, tell the removed device to restart the first-time-setup. |
| GET | `/devices/add` | cookies: `device id`, `device secret` | `device add code` | Return a code for linking a new device and start accepting devices added via this code. |
| REMOVE | `/devices/add` | cookies: `device id`, `device secret`; `device add code` to invalidate | | When closing the 'add devices' window, this enpoint is called to stop accepting new devices. Action is also run after 5 minutes on the server. |
| POST | `/devices/add` | cookies: `device id`, `device secret`; device add code` to redeem | | Add device to the persona this code was created for and merge contacts. |

## Contacts

| verb | endpoint | payload | return | decription |
| --- | --- | --- | --- | --- |
| GET | `/contacts` | cookies: `device id`, `device secret` | List of all personas in contacts | List contacts |
| REMOVE | `/contacts` | cookies: `device id`, `device secret` | | Remove contacts on both sides |
| GET | `/contacts/add` | cookies: `device id`, `device secret` | `contact add code` | Get a code to add new contacts to both devices |
| REMOVE | `/contacts/add` | cookies: `device id`, `device secret`; `device add code` to invalidate | | Revoke the contact adding key
| POST | `/contacts/add` | cookies: `device id`, `device secret`, `contact add code` to redeem | | Add contact to both personas |

## File-sharing (To-do: Websockets)

| verb | endpoint | payload | return | description |
| --- | --- | --- | --- | --- |
| POST | `/listen` | cookies: `device id`, `device secret`; `web push endpoint`, `CSRF prevention token` | `401: Not Authorised` if invalid credentials or no persona found (device was removed) | Send web push endpoint for messages + CSRF key |
| GET (`Upgrade: WebSocket`) | `/share` | cookies: `device id`, `device secret` | WebSocket | Open Websocket that streams user online updates (show persons not devices) and gets messages requesting a WebRTC connection with receiving devices (create a `sharing token` for each device) |
| GET (`Upgrade: WebSocket`) | `/accept` | cookies: `device id`, `device secret`; `sharing token` | WebSocket | Open Websocket with server (sending device) to negotiate WebRTC conenction |
| GET | `/keepalive` | cookies: `device id`, `device secret` | | Send keepalive packet (for online-status) |


### (Groups)
- GET /groups: List groups
- REMOVE /groups: Remove group
- POST /create-group: Create group
- POST /add-user: Add user to group
- REMOVE /remove-user: Remove user from group
- POST /manage-group: Modify group description, rights, ...
