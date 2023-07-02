# API Routes

<h1> NOT UP TO DATE ANYMORE. LOOK AT THE POSTMAN COLLECTION!!! </h1>

## User

| verb | endpoint | payload | return | description |
| --- | --- | --- | --- | --- |
| POST | `/user/info` | cookies: `device id`, `device secret`; `new username` and/or `new avatar string` | | Set new user info |

## Devices

| verb | endpoint | payload | return | description |
| --- | --- | --- | --- | --- |
| GET | `/user/devices` | cookies: `device id`, `device secret` | List of all devices connected to user | List all devices linked to the user the requesting device is linked to.
| POST | `/user/devices/remove` | cookies: `device id`, `device secret`; `device id` to remove | | Remove a device from the user the requesting device is linked to. At next connection from the removed device, tell it to restart the first-time-setup. |
| GET | `/user/devices/link` | cookies: `device id`, `device secret` | `device add code` | Return a code for linking a new device and start accepting devices added via this code. |
| REMOVE | `/user/devices/link` | cookies: `device id`, `device secret` | | When closing the 'add devices' window, this endpoint is called to stop accepting new devices using the previously generated code. Action is also run after 5 minutes on the server. |
| POST | `/user/devices/link` | cookies: `device id`, `device secret`; device add code` to redeem | | Add device to the user this code was created for and merge contacts. |

## Contacts

| verb | endpoint | payload | return | description |
| --- | --- | --- | --- | --- |
| GET | `/user/contacts` | cookies: `device id`, `device secret` | List of all personas in contacts | List contacts |
| POST | `/user/contacts/remove` | cookies: `device id`, `device secret`; `user id` of contact to remove | | Remove contacts on both sides |
| GET | `/user/contacts/add` | cookies: `device id`, `device secret` | `contact add code` | Get a code to add new contacts to both devices |
| REMOVE | `/user/contacts/add` | cookies: `device id`, `device secret` | | Revoke the contact adding key
| POST | `/user/contacts/add` | cookies: `device id`, `device secret`, `contact add code` to redeem | | Add contact to both personas |

## File-sharing (To-do: Websockets)

| verb | endpoint | payload | return | description |
| --- | --- | --- | --- | --- |
| POST | `/listen` | cookies: `device id`, `device secret`; `web push endpoint`, `CSRF prevention token` | `401: Not Authorized` if invalid credentials or no persona found (device was removed) | Send web push endpoint for messages + CSRF key |
| GET (`Upgrade: WebSocket`) | `/share` | cookies: `device id`, `device secret` | WebSocket | Open Websocket that streams user online updates (show persons not devices) and gets messages requesting a WebRTC connection with receiving devices (create a `sharing token` for each device) |
| GET (`Upgrade: WebSocket`) | `/accept` | cookies: `device id`, `device secret`; `sharing token` | WebSocket | Open Websocket with server (sending device) to negotiate WebRTC connection |
| GET | `/keepalive` | cookies: `device id`, `device secret` | | Send keepalive (for online-status) |


### (Groups)
- GET /groups: List groups
- REMOVE /groups: Remove group
- POST /create-group: Create group
- POST /add-user: Add user to group
- REMOVE /remove-user: Remove user from group
- POST /manage-group: Modify group description, rights, ...
