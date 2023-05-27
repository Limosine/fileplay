CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    displayName TEXT NOT NULL,
    isOnline INTEGER NOT NULL,
    avatarSeed TEXT NOT NULL
);

CREATE TABLE devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    displayName TEXT NOT NULL,
    type TEXT NOT NULL,
    isOnline INTEGER NOT NULL
);

CREATE TABLE devicesToUsers (
    did INTEGER,
    uid INTEGER,
    FOREIGN KEY (did) REFERENCES devices(id),
    FOREIGN KEY (uid) REFERENCES users(id)
);

CREATE INDEX idx_devicesToUsers_did ON devicesToUsers (did);
CREATE INDEX idx_devicesToUsers_uid ON devicesToUsers (uid);

CREATE TABLE contacts (
    a INTEGER,
    b INTEGER,
    FOREIGN KEY (a) REFERENCES users(id),
    FOREIGN KEY (b) REFERENCES users(id)
);

CREATE INDEX idx_contacts_a ON contacts(a);
CREATE INDEX idx_contacts_b ON contacts(b);
