import "reflect-metadata"
import {  GCalFactory } from "./services/gcal";
import { CalendarSyncService } from "./services/calendar-sync";
import { seed, resetDb } from "./seed";
import { Hub } from "./entity/Hub";
import { logger } from "./logger";
import { getDatasource } from "./db";


export async function syncDatabase() {
    const connection = await getDatasource();

    // Reset and seed database?
    if (process.env["HUBSUITE_SEED"] == "true") {
        logger.info("Seeding");
        try {
            await resetDb(connection);
            await seed(connection);
        } catch (err) {
            logger.error(err);
        }
    } else {
        console.log("Skipping seed");
    }

    // Sync YYC Data community calendars into database
    if (process.env["CALENDAR_SEED"] != "false") {
        try {
            const factory = new GCalFactory();
            const sync = new CalendarSyncService(factory, connection);
            logger.info("Fetching YYC Data Hub");
            const hub = await connection
                .getRepository(Hub)
                .find({ where: {name: "YYC Data Community" }});
            const id = hub[0].id;
            logger.info("Syncing community calendars to hub");
            await sync.syncHub(id);
            logger.info("Syncing hub database to shared calendar");
            await sync.syncToSharedCalendar(id);
        } catch (e) {
            logger.error(
                `Failed syncing calendar. | ${e.message}\n stack trace - ${e.stack}`
            );
        }
    }


}