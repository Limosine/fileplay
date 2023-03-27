# Database

## User
- id: uuid <primary>
- name: string
- avatarSeed: string
- contacts: [ User ] (added: datetime)
- devices: [ Device ] (added: datetime)

## Device
- id: uuid <primary>
- publicKey: string
- authHash: string
- authSalt: string
- user: User (added: datetime)
- isOnline: boolean
- lastSeen: datetime
- webPushEndpoint: string
- webPushP256DH: string
- webPushNoCSRF: string

### (Group)
- id: id
- creator: User
- name: string
- description: string
- people: [ User ] (with attribute 'Permission')
