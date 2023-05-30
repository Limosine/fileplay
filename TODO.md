# TODO

- [ ] check if the set cookie still links to a valid device and restart setup if not the case
- [ ] return error on all api routes if cookies don't point to a valid device
- [ ] delete orphan db entries (users that don't have linked devices, expired linking codes) on cron job
- [ ] validation function for Linking Code field in SetupDialog. Only allow [a-zA-Z0-9]{6} be entered
