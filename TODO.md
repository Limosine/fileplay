# todo

- [ ] Frontend
  - [ ] Settings page on desktop
  - [ ] More contact infos
  - [ ] Keybinding
  - [ ] Info Popup
  - [ ] Regenerate code on file selection change
  - [ ] Progress on guest page
  - [ ] Check for browser compatibility and redirect
  - [ ] Offload chunking & concatenation to the Service Worker
        - Large files interrupt the WebSocket connection
          --> Fails to send

- [ ] Backend
  - [ ] Delete orphan db entries (users that don't have linked devices and have a old creation date, expired linking codes) on cron job
