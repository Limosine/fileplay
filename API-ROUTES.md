## API Routes

# Device
- GET /devices: List devices
- REMOVE /devices: Remove device --> restart registration
- GET /add-devices: Open code window, get code
- REMOVE /add-devices: When closing window
- POST /add-devices: Add device, post add code, merge contacts

# Contacts
- GET /contacts: List contacts
- REMOVE /contacts: Remove contacts on both sides
- GET /add-contacts: Open code window, get code
- REMOVE /add-contacts: When closing window
- POST /add-devices: Add device, post add code

# File-sharing (To-do: Websockets)
- POST /listen: Send web push endpoint for messages + CSRF key
- GET /share: Open Websocket that streams user online updates (shows persons)
- GET /receive: Open Websocket to establish WebRTC connection
- GET /keepalive: Send keepalive packet (for e.g. Online-Status)


# Groups
- GET /groups: List groups
- REMOVE /groups: Remove group
- POST /create-group: Create group
- POST /add-user: Add user to group
- REMOVE /remove-user: Remove user from group
- POST /manage-group: Modify group description, rights, ...
