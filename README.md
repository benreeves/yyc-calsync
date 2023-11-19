# YYC Data - Community Calendar Sync

This repository fetches events from multiple different event sources, such as meetup groups and google calendar feeds, aggregates the events into a centralized database, and then sends the consolidated feed to various different event sinks such as the YYC Data Society's Webflow CMS system and a shared google calendar. Different communities which host events are grouped into a hub (currently the only hub is the YYC Data Society) and the events for a hub are grouped together.

![YYC Calsync drawio](https://github.com/benreeves/yyc-calsync/assets/44094616/d2a5ded6-a215-4806-9dd6-2d3b480897b5)

## Installation and Commands

```sh
$ npm i
```
```sh
$ npm run build
```
```sh
$ npm start
```

## Deployment

#TODO post refactored system needs a new home

## Tools and Technologies

- Typescript
- TypeORM
- Postgres
- Meeup Oauth API
- Gcal API & Service accounts
- GCP for deployment
