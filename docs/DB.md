# Database

<h1> NOT UPTO DATE</h1>

## User
- id: integer <primary>
- name: text
- avatarSeed: text

## Device
- id: uuid <primary>
- authHash: string
- authSalt: string
- userId: User (added: datetime)
- isOnline: boolean
- lastSeen: datetime
- webPushEndpoint: string
- webPushP256DH: string
- webPushNoCSRF: string

A public key is created during each connection

### (Group)
- id: id
- creator: User
- name: string
- description: string
- people: [ User ] (with attribute 'Permission')
