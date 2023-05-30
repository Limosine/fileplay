CREATE TABLE devicesLinkCodes (
    code TEXT PRIMARY KEY,
    uid INTEGER NOT NULL,
    created_did INTEGER NOT NULL, -- created by device id
    expires DATETIME NOT NULL,
    FOREIGN KEY (uid) REFERENCES devices(id)
);

CREATE TABLE contactsLinkCodes (
    code TEXT PRIMARY KEY,
    uid INTEGER NOT NULL,
    created_did INTEGER NOT NULL, -- created by device id
    expires DATETIME NOT NULL,
    FOREIGN KEY (uid) REFERENCES users(id)
);

