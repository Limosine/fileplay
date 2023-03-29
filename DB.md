# Database

## User
- id: integer <primary>
- name: text
- avatarSeed: text

## Device
- id: integer <primary>
- publicKey: text
- authHash: text
- authSalt: text
- user: id in User <foreign>
- isOnline: integer
- lastSeen: integer
- webPushEndpoint: text
- webPushP256DH: text
- webPushNoCSRF: text

## UserToUser
- id: id in User <primary>
- contact: id in User <foreign>

## UserToDevice
- id: id in User <primary>
- linked: id in Device <foreign>

### (Group)
- id: id
- creator: User
- name: string
- description: string
- people: [ User ] (with attribute 'Permission')
