create table users (
    uid integer primary key autoincrement,
    displayName text not null,
    avatarSeed text not null,
    createdAt integer not null default (unixepoch('now')),
    lastSeenAt integer not null default (unixepoch('now'))
);

create table devices (
    did integer primary key autoincrement,
    displayName text not null,
    type text not null,
    uid integer,
    linkedAt integer,
    createdAt integer not null default (unixepoch('now')),
    lastSeenAt integer not null default (unixepoch('now')),
    websocketId text,
    pushSubscription text,
    foreign key (uid) references users(uid)
);

create table devicesLinkCodes (
    code text primary key not null,  -- the linking code
    uid integer not null,  -- the uid to link the device to
    created_did integer not null, -- created by device id
    expires integer not null,  -- when the linking code expires
    foreign key (uid) references devices(did)
);

create table contactsLinkCodes (
    code text primary key not null,  -- the linking code
    uid integer not null,  -- the uid to link the user to
    created_did integer not null, -- created by device id
    expires integer not null,  -- when the linking code expires
    foreign key (uid) references users(uid)
);

create index idx_devices_uid on devices (uid);

create table contacts (
    cid integer primary key autoincrement,
    a integer not null,
    b integer not null,
    createdAt integer not null default (unixepoch('now')),
    foreign key (a) references users(uid),
    foreign key (b) references users(uid)
);

create table sharing (
    sid integer primary key autoincrement,  -- id of sharing process
    did integer not null, -- id of the device to direct the response to
    uid integer not null, -- id of the user this share can be accepted by
    expires integer not null, -- when the sharing process expires
    foreign key (did) references devices(did)
    foreign key (uid) references users(uid)
);

create index idx_contacts_a on contacts(a);
create index idx_contacts_b on contacts(b);

create table keepAliveCodes (
    code text primary key not null,  -- the keep alive code
    did integer not null,  -- the device id to keep alive
    foreign key (did) references devices(did)
);
