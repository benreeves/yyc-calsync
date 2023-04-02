# YYC Data - Webflow Calsync

This server fetches data from the events API and updates the Webflow CMS accordingly.

## Installation

```sh
$ npm i
```

## Deployment

For continuous deployment to Heroku: <br>

-   Connect this repo to Heroku: Deploy > Deployment method > GitHub
-   Add all environmental variables from the .env file to: Settings > Config Vars
-   Enable automatic deploys: Deploy > Automatic Deploys > Enable Automatic Deploys

Manually deploy the first time: Deploy > Manual Deploy > Deploy Branch

## Usage

Update HOURS env var: Number of hours between each sync. <br>
Update other env vars as needed.

## Development

```sh
$ npm run dev
```
