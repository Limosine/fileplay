# README

Database migrations to be executed on a PostgreSQL database.

- `psql -U fileplay -d fileplay --host=127.0.0.1 -f up.sql`

- `psql -U fileplay -d fileplay --host=127.0.0.1 -f down.sql`

## naming

`<ISO 8601 time (UTC, w/o timezone, ':' replaced by '-')>_<up|down>.sql`
