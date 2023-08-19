create table users (
    uid integer primary key autoincrement,
    displayName text not null,
    avatarSeed text not null,
    createdAt integer not null default (unixepoch('now')),
    lastSeenAt integer not null default (unixepoch('now')),
    isOnline integer not null default 0
);

create table devices (
    did integer primary key autoincrement,
    displayName text not null,
    type text not null,
    uid integer,
    linkedAt integer,
    createdAt integer not null default (unixepoch('now')),
    lastSeenAt integer not null default (unixepoch('now')),
    isOnline integer not null default 0,
    peerJsId text,
    encryptionPublicKey text not null,
    foreign key (uid)
        references users(uid)
        on delete cascade
);

create table devicesLinkCodes (
    code text primary key not null,  -- the linking code
    uid integer not null,  -- the uid to link the device to
    created_did integer not null, -- created by device id
    expires integer not null,  -- when the linking code expires
    foreign key (uid)
        references users(uid)
        on delete cascade
);

create table contactsLinkCodes (
    code text primary key not null,  -- the linking code
    uid integer not null,  -- the uid to link the user to
    created_did integer not null, -- created by device id
    expires integer not null,  -- when the linking code expires
    foreign key (uid)
        references users(uid)
        on delete cascade
);

create index idx_devices_uid on devices(uid);

create table contacts (
    cid integer primary key autoincrement,
    a integer not null,
    b integer not null,
    createdAt integer not null default (unixepoch('now')),
    foreign key (a)
        references users(uid)
        on delete cascade,
    foreign key (b)
        references users(uid)
        on delete cascade
);

create index idx_contacts_a on contacts(a);
create index idx_contacts_b on contacts(b);
