# YYC Data - Community Calendar Sync

This repository fetches events from multiple different event sources, such as meetup groups and google calendar feeds, aggregates the events into a centralized database, and then sends the consolidated feed to various different event sinks such as the YYC Data Society's Webflow CMS system and a shared google calendar. Different communities which host events are grouped into a hub (currently the only hub is the YYC Data Society) and the events for a hub are grouped together.

![YYC Calsync drawio](https://github.com/benreeves/yyc-calsync/assets/44094616/d2a5ded6-a215-4806-9dd6-2d3b480897b5)

## Installation and Commands

Copy and save the .env file from the project page in the YYC Data Notion https://www.notion.so/yycdata/Event-Feed-v2-fbee799f8551422cb30cd9d5ddb191da?pvs=4

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

- ensure a .env file (see above) is installed on the server

### Setup a VM

Currently the app is deployed to a small VM hosted on the Data Society's GCP instance. The project is yyc-calsync-prod and the vm is yycdata-gp1. 
In order for the VM to connect to the database, the following steps were followed: https://cloud.google.com/sql/docs/mysql/connect-instance-compute-engine#node.js_3

Connecting the database to vm, followed these intstructions https://cloud.google.com/sql/docs/mysql/connect-instance-compute-engine

#### Setup NVM
1. Install nvm: `sudo apt install curl -y` then
    `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash`
2. Reload bashrc `source ~/.bashrc`
3. Install node `nvm install --lts`
3. Use node `nvm use --lts`

#### Ensure cloud sql proxy is running
1. Refer to the compute instance instructions above from GCP to install the cloud sql proxy. GCP is a bit frustrating as we need to install some proxy service to allow vms to connect to databases... 
2. Start the proxy
`./cloud-sql-proxy yycdata-calsync-prod:us-west1:hubsuite &`


#### Download repo
1. Install git `sudo apt-get install git`
2. Clone repo `mkdir src && cd src && git clone https://github.com/benreeves/yyc-calsync.git && cd yyc-calsync`
3. Install repo `npm i`
4. Install repo `npm run build`
5. Run command `npm start`

#### Setup systemctl job
Run `bash ./setupsystemd.sh`
Run `bash ./setupclkoudproxy.sh`

## Tools and Technologies

- Typescript
- TypeORM
- Postgres
- Meeup Oauth API
- Gcal API & Service accounts
- GCP for deployment
