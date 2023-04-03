import dotenv from "dotenv";
import { syncDatabase } from "./src/dbsync"
import { syncWebflow } from "./src/webflowsync";
import { logger } from "./src/logger";
import { initialize } from "./src/db";

dotenv.config();
logger.info("Starting app");


initialize()
	.then(async _ => {
		await syncDatabase();
		await syncWebflow()
	})
	.catch(logger.error);