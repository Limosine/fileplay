# TODO

- [ ] check if the set cookie still links to a valid device and restart setup if not the case
- [x] return error on all api routes if cookies don't point to a valid device
- [ ] delete orphan db entries (users that don't have linked devices and have a old creation date, expired linking codes) on cron job
- [x] validation function for Linking Code field in SetupDialog. Only allow [a-zA-Z0-9]{6} be entered
- [x] implement /api/contacts after largely the same schema as /api/devices
-  move into monorepo (nx, turborepo, bazel, ...?)
- [ ] check for browser compatibility and redirect
- [x] periodically check for sw updates
- [x] fix pwa asset images transparency
- [x] on new sw version available send notification (which sends skip_waiting) / reinstall on refresh
- [x] ask for notification permission
