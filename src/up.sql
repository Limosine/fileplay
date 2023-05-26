CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    displayName TEXT NOT NULL,
    isOnline INTEGER NOT NULL,
    avatarSeed TEXT NOT NULL
);

CREATE TABLE devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    displayName TEXT NOT NULL,
    isOnline INTEGER NOT NULL
);

CREATE TABLE devicesUsers (
    did INTEGER PRIMARY KEY,
    _uid INTEGER NOT NULL
);

CREATE INDEX idx_devicesUsers_uid ON devicesUsers (_uid);
