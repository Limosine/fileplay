# Encryption

## Layers

- WebRTC E2EE (DTLS) / WebSocket NOT-E2EE (SSL/TLS)

- Asymmetric + Symmetric E2EE (optional)
  - Asymmetric: ECDH P-256 (Not consistent across sessions)
  - Symmetric: Derived AES-GCM 256

## Data schema

### Data encoding

- MessagePack

### Encrypted

| Bytes | Content        |
| :---: | -------------- |
|   1   | Encrypted (1)  |
|   7   | Random (IV)    |
|   1   | ID (IV)        |
|   4   | Counter (IV)   |
|  ...  | Encrypted data |

### Unencrypted

| Bytes | Content          |
| :---: | ---------------- |
|   1   | Encrypted (0)    |
|  ...  | Unencrypted data |