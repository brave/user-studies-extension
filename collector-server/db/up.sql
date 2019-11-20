begin;

create table readings (
    id serial not null,
    client_id uuid not null,
    sensor varchar(32) not null,
    readings json not null,
    created_at timestamp default current_timestamp not null
);

create table consents (
    id serial not null,
    client_id uuid not null,
    email varchar(100),
    consent varchar(32) not null,
    created_at timestamp default current_timestamp not null
);

commit;
