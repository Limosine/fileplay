# Database

## User
- id: uuid <primary>
- name: string
- avatarSeed: string
- contacts: [ User ] (added: datetime)
- devices: [ Device ] (added: datetime)

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
