CREATE TABLE devicesLinkCodes (
    code TEXT PRIMARY KEY,
    uid INTEGER NOT NULL,
    expires DATETIME NOT NULL,
    FOREIGN KEY (uid) REFERENCES devices(id)
);

CREATE TABLE contactsLinkCodes (
    code TEXT PRIMARY KEY,
    uid INTEGER NOT NULL,
    expires DATETIME NOT NULL,
    FOREIGN KEY (uid) REFERENCES users(id)
);

