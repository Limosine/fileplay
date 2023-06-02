create table users (
    uid integer primary key autoincrement,
    displayName text not null,
    isOnline integer default 0 not null,
    avatarSeed text not null,
    createdAt integer not null default (unixepoch('now')),
    lastSeenAt integer not null default (unixepoch('now'))
);

create table devices (
    did integer primary key autoincrement,
    displayName text not null,
    type text not null,
    isOnline integer DEFAULT 0 not null,
    createdAt integer not null default (unixepoch('now')),
    lastSeenAt integer not null default (unixepoch('now')),
    peerJsId text not null,
    encryptionPublicKey text not null,
    pushSubscription integer,
    foreign key (pushSubscription) references pushSubscriptions(pid)
);

create table pushSubscriptions (
    pid integer primary key autoincrement,
    endpoint text not null,
    p256dh text not null,
    auth text not null
);

create table devicesToUsers (
    did integer primary key not null,
    uid integer not null,
    createdAt integer not null default (unixepoch('now')),
    foreign key (did) references devices(did),
    foreign key (uid) references users(uid)
);

create table devicesLinkCodes (
    code text primary key not null,
    uid integer not null,
    created_did integer not null, -- created by device id
    expires integer not null,
    foreign key (uid) references devices(did)
);

create table contactsLinkCodes (
    code text primary key not null,
    uid integer not null,
    created_did integer not null, -- created by device id
    expires integer not null,
    foreign key (uid) references users(uid)
);



create index idx_devicesToUsers_did on devicesToUsers (did);
create index idx_devicesToUsers_uid on devicesToUsers (uid);

create table contacts (
    cid integer primary key autoincrement,
    a integer not null,
    b integer not null,
    createdAt integer not null default (unixepoch('now')),
    foreign key (a) references users(uid),
    foreign key (b) references users(uid)
);

create index idx_contacts_a on contacts(a);
create index idx_contacts_b on contacts(b);
