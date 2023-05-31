create table devicesLinkCodes (
    code text primary key,
    uid integer not null,
    created_did integer not null, -- created by device id
    expires integer not null,
    foreign key (uid) references devices(id)
);

create table contactsLinkCodes (
    code text primary key,
    uid integer not null,
    created_did integer not null, -- created by device id
    expires integer not null,
    foreign key (uid) references users(id)
);

