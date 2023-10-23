import dotenv from "dotenv";
import { logger } from "./src/logger";
import { getDatasource, initialize } from "./src/db";
import { CalsyncRepository } from "src/calsync-repository";
import { MeetupClient, MeetupClientConfig } from "src/services/meetupClient";
import { GCalFactory } from "src/services/gcal";
import { EventSyncService } from "src/event-sync-service";

dotenv.config();
logger.info("Starting app");

async function main() {

	// Wire up dependencies
	logger.info("Building dependencies");
    const connection = await getDatasource();
	const repo = new CalsyncRepository(connection);
	const meetupClient = new MeetupClient(getMeetupClientConfigFromEnv());
	const gcalFactory = new GCalFactory(); // This should also have a config similar 

	logger.info('Fetching YYC Data Society Hub')
	const hub = await repo.getHubByName('YYC Data Community');

	logger.info('Running sync')
	const synchonizationEngine = new EventSyncService(hub, repo, gcalFactory, meetupClient);
	await synchonizationEngine.sync();
}

function getMeetupClientConfigFromEnv(): MeetupClientConfig {
    const {
        MEETUP_PRIVATE_KEY,
        MEETUP_CONSUMER_KEY,
        MEETUP_AUTHORIZED_MEMBER_ID,
        MEETUP_SIGNING_KEY_ID,
        MEETUP_GROUP_URLS,
        MEETUP_PRO_NETWORK
    } = process.env;

    // Eagerly check for required variables and throw if any are missing
    if (!MEETUP_PRIVATE_KEY) throw new Error('Missing MEETUP_PRIVATE_KEY in .env file');
    if (!MEETUP_CONSUMER_KEY) throw new Error('Missing MEETUP_CONSUMER_KEY in .env file');
    if (!MEETUP_AUTHORIZED_MEMBER_ID) throw new Error('Missing MEETUP_AUTHORIZED_MEMBER_ID in .env file');
    if (!MEETUP_SIGNING_KEY_ID) throw new Error('Missing MEETUP_SIGNING_KEY_ID in .env file');

    const groupUrls = MEETUP_GROUP_URLS ? MEETUP_GROUP_URLS.split(',') : undefined;

    return {
        privateKey: MEETUP_PRIVATE_KEY,
        consumerKey: MEETUP_CONSUMER_KEY,
        authorizedMemberId: MEETUP_AUTHORIZED_MEMBER_ID,
        signingKeyId: MEETUP_SIGNING_KEY_ID,
        proNetwork: MEETUP_PRO_NETWORK,
        groupUrls: groupUrls
    };
}

initialize()
	.then(async _ => {
		await main();
	})
	.catch(logger.error);
