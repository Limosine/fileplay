CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    displayName TEXT NOT NULL,
    isOnline INTEGER DEFAULT 0 NOT NULL,
    avatarSeed TEXT NOT NULL,
    createdAt DATETIME DEFAULT 'now'
);

CREATE TABLE devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    displayName TEXT NOT NULL,
    type TEXT NOT NULL,
    isOnline INTEGER DEFAULT 0 NOT NULL,
    createdAt DATETIME DEFAULT 'now'
);

CREATE TABLE devicesToUsers (
    did INTEGER PRIMARY KEY,
    uid INTEGER,
    createdAt DATETIME DEFAULT 'now',
    FOREIGN KEY (did) REFERENCES devices(id),
    FOREIGN KEY (uid) REFERENCES users(id)
);

CREATE INDEX idx_devicesToUsers_did ON devicesToUsers (did);
CREATE INDEX idx_devicesToUsers_uid ON devicesToUsers (uid);

CREATE TABLE contacts (
    _id INTEGER PRIMARY KEY AUTOINCREMENT,
    a INTEGER,
    b INTEGER,
    createdAt DATETIME DEFAULT 'now',
    FOREIGN KEY (a) REFERENCES users(id),
    FOREIGN KEY (b) REFERENCES users(id)
);

CREATE INDEX idx_contacts_a ON contacts(a);
CREATE INDEX idx_contacts_b ON contacts(b);
