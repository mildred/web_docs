WebDocs - HTML based word processor
===================================

This project came with the disatisfaction of open source word processors for
edition.

Hopefully, the HTML + JavaScript stack would allow more configurable cross
references table of contents and indexes while CSS allors for pretty good
styling.

It uses [PagedJS](https://pagedjs.org) for the page layouts and
[Tauri](https://tauri.app/) for development.

Development
-----------

Getting started:

    npm run tauri dev

Change version:

  - update version number in `src-tauri/tauri.conf.json` (most important)
  - update version number in `package.json` (less important)
  - commit: `git commit -am "$(jq '"v"+.version' src-tauri/tauri.conf.json)"`
  - push: `git push origin HEAD`
  - GitHub workflow will create automatically the Git tag
  - update version number to next minor release following semver

