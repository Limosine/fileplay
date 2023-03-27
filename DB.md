## Database

# Person
- id: int
- name: String
- imageID: int
- contacts: [ Person ]
- devices: [ Device ]

# Device
- id: int
- publicKey: String (for receiving files)
- authHash: String (Authentication with the API)
- isOnline: boolean
- pushLink: String
- pushCSRFkey: String

# Group
- id: id
- creator: Person
- name: String
- description: String
- people: [ Person ] (with attribute 'Permission')
