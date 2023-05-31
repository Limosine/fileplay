create table users (
    id integer primary key autoincrement,
    displayName text not null,
    isOnline integer default 0 not null,
    avatarSeed text not null,
    createdAt integer not null -- unix timestamp
);

create table devices (
    id integer primary key autoincrement,
    displayName text not null,
    type text not null,
    isOnline integer DEFAULT 0 not null,
    createdAt integer not null  -- unix timestamp
);

create table devicesToUsers (
    did integer primary key,
    uid integer not null,
    createdAt integer not null, -- unix timestamp
    foreign key (did) references devices(id),
    foreign key (uid) references users(id)
);

create index idx_devicesToUsers_did on devicesToUsers (did);
create index idx_devicesToUsers_uid on devicesToUsers (uid);

create table contacts (
    cid integer primary key autoincrement,
    a integer not null,
    b integer not null,
    createdAt integer not null, -- unix timestamp
    foreign key (a) references users(id),
    foreign key (b) references users(id)
);

create index idx_contacts_a on contacts(a);
create index idx_contacts_b on contacts(b);
