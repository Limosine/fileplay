CREATE TABLE devicesLinkCodes (
    code TEXT PRIMARY KEY,
    uid INTEGER,
    expires DATETIME,
    FOREIGN KEY (uid) REFERENCES devices(id)
);

CREATE TABLE contactsLinkCodes (
    code TEXT PRIMARY KEY,
    uid INTEGER,
    expires DATETIME,
    FOREIGN KEY (uid) REFERENCES users(id)
);

