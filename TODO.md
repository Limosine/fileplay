# TODO

- [ ] check if the set cookie still links to a valid device and restart setup if not the case
- [ ] return error on all api routes if cookies don't point to a valid device
- [ ] delete orphan db entries (users that don't have linked devices and have a old creation date, expired linking codes) on cron job
- [ ] validation function for Linking Code field in SetupDialog. Only allow [a-zA-Z0-9]{6} be entered
- [ ] implement /api/contacts after largely the same schema as /api/devices
- [ ] move into monorepo (nx, turborepo, bazel, ...?)
- [ ] check for browser compatibility and redirect 
- [ ] periodically scheck for sw updates
