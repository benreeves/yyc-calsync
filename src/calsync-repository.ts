import { DataSource } from "typeorm";
import { Hub } from "./entity/Hub";
import { CommunityEvent } from "./entity/CommunityEvent";
import { HubEventXref } from "./entity/HubEventXref";
import { ActionType, EventAction } from "./event-stream/event-feed-consolidator";
import { Community } from "./entity/Community";
import { logger } from "./logger";
import moment from "moment";

export class EventsSearch {
	hubId?: string;
	communityId?: string;
	minDate?: string;
	maxDate?: string;
}

export class CalsyncRepository {

    private connection: DataSource;  

    constructor(connection: DataSource) {
        this.connection = connection;
    }

    async getCommunityIdsByHubId(hubId: string): Promise<string[]> {
        const communities = await this.connection
            .getRepository(Hub)
            .createQueryBuilder("hub")
            .innerJoinAndSelect("hub.communities", "community")
            .where("hub.id = :hubId", { hubId })
            .select("community.id")
            .getRawMany();

        return communities.map((c) => c.community_id);
    }

    async getCommunitiesByHub(hubId: string): Promise<Community[]> {
        const hubQueryResult = await this.connection
            .getRepository(Hub)
            .createQueryBuilder("hub")
            .innerJoinAndSelect("hub.communities", "community")
            .where("hub.id = :hubId", { hubId })
            .getOne();

        return hubQueryResult.communities;
    }

    async processEventActions(actions: EventAction[]): Promise<{ saved: CommunityEvent[], deleted: CommunityEvent[] }> {
        logger.info('Starting to process event actions...');

        const toDelete: CommunityEvent[] = [];
        const toAddOrUpdate: CommunityEvent[] = [];

        actions.forEach(action => {
            switch (action.action) {
                case ActionType.ADD:
                    logger.info(`Preparing to add event with ID: ${action.event.id}`);
                    toAddOrUpdate.push(action.event);
                    break;
                case ActionType.UPDATE:
                    logger.info(`Preparing to update event with ID: ${action.event.id}`);
                    toAddOrUpdate.push(action.event);
                    break;
                case ActionType.DELETE:
                    logger.info(`Preparing to delete event with ID: ${action.event.id}`);
                    toDelete.push(action.event);
                    break;
                case ActionType.NONE:
                default:
                    // Do nothing for NONE action
                    break;
            }
        });

        const hasDelete = toDelete && toDelete.length;
        const hasSave = toAddOrUpdate && toAddOrUpdate.length;

        if (hasDelete || hasSave) {
            try {
                await this.connection.transaction(async (manager) => {
                    if (hasDelete) {
                        logger.info(`Deleting ${toDelete.length} events...`);
                        await this.deleteEvents(manager, toDelete.map(x => x.id));
                    }
                    
                    if (hasSave) {
                        logger.info(`Saving/updating ${toAddOrUpdate.length} events...`);
                        await this.saveEvents(manager, toAddOrUpdate);
                    }
                });
            } catch (error) {
                logger.error('Error during transaction:', error);
            }
        } else {
            logger.info('No events to process (save/update or delete).');
        }

        return {
            saved: toAddOrUpdate,
            deleted: toDelete
        };
    }

    async getCommunityById(communityId: string): Promise<Community> {
        const repo = this.connection.getRepository(Community);
        const community = await repo.findOne({where: {id: communityId}});
        return community

    }

    async getCommunityByName(name: string): Promise<Community> {
        const repo = this.connection.getRepository(Community);
        const community = await repo.findOne({where: {name: name}});
        return community

    }

    private async deleteEvents(manager: any, toDelete: string[]): Promise<void> {
        if(!toDelete || toDelete.length == 0) return;
        await manager
            .createQueryBuilder()
            .delete()
            .from(CommunityEvent)
            .where("externalId IN (:...ids)", { ids: toDelete })
            .execute();
    }

    private async saveEvents(manager: any, toSave: CommunityEvent[]): Promise<void> {
        await manager.getRepository(CommunityEvent).save(toSave);
    }

    async addEventXrefToDb(
        communityEvent: CommunityEvent,
        hubId: string,
        gid: string
    ): Promise<any> {
        const xref = new HubEventXref();
        xref.communityEvent = communityEvent;
        xref.communityEventId = communityEvent.id;
        xref.communityEventExternalId = communityEvent.externalId;
        xref.hubId = hubId;
        xref.hubEventExternalId = gid;
        return this.connection.getRepository(HubEventXref).save(xref);
    }

    async getAllEventXrefs(hubId: string): Promise<HubEventXref[]> {
        const xrefs = await this.connection
            .getRepository(HubEventXref)
            .createQueryBuilder("xref")
            .innerJoin("xref.hub", "hub")
            .innerJoinAndSelect("xref.communityEvent", "evt")
            .where("hub.id = :hubId", { hubId })
            .getMany();

        return xrefs.sort((a, b) => a.id.localeCompare(b.id));
    }

    async getEventXrefsByHubId(hubId: string, eventIds: string[]): Promise<HubEventXref[]> {
        console.log(eventIds);
        let builder = this.connection
            .getRepository(HubEventXref)
            .createQueryBuilder("xref")
            .innerJoin("xref.hub", "hub")
            .innerJoinAndSelect("xref.communityEvent", "evt")
            .where("hub.id = :hubId", { hubId });
        
        if (eventIds && eventIds.length > 0) {
            builder = builder
                .andWhere("evt.id IN (:...ids)", { ids: eventIds})
        }
        const xrefs = await builder.getMany();
        return xrefs.sort((a, b) => a.id.localeCompare(b.id));
    }

    async getDbEventsByHubIdAndDateRange(
        hubId: string,
        sd: moment.Moment,
        ed: moment.Moment
    ): Promise<CommunityEvent[]> {
        return await this.connection
            .getRepository(CommunityEvent)
            .createQueryBuilder("evt")
            .innerJoin("evt.community", "community")
            .innerJoin("community.hubs", "hub")
            .where("hub.id = :hubId", { hubId })
            .andWhere("evt.startDate >= :sd", { sd })
            .andWhere("evt.endDate <= :ed", { ed })
            .getMany();
    }

    async deleteXrefById(id: string): Promise<void> {
        await this.connection
            .createQueryBuilder()
            .delete()
            .from(HubEventXref)
            .where("id = (:id)", { id })
            .execute();
    }

    async getEventsForCommunity(communityId: string): Promise<CommunityEvent[]> {
        const eventRepo = this.connection.getRepository(CommunityEvent);
        const savedEvents = await eventRepo.find({ where: {communityId: communityId}});
        return savedEvents;
    }

    async getEventsForHub(hubId: string): Promise<CommunityEvent[]> {
        const events = await this.connection.getRepository(CommunityEvent)
            .createQueryBuilder("events")
            .innerJoinAndSelect("events.community", "community")
            .innerJoin("community.hubs", "hub")
            .where("hub.id = :hubId", { hubId })
            .getMany() ;
        return events;
    }

    async getHub(hubId): Promise<Hub> {
        const hub = await this.connection
            .getRepository(Hub)
            .findOne({where: {id: hubId}  });
        return hub;
    }
    async getHubByName(name: string): Promise<Hub> {
        const hub = await this.connection
            .getRepository(Hub)
            .findOne({where: {name: name}  });
        return hub;
    }

	protected checkBadUuid(uuid: string): void {

		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(uuid)) {
			throw new Error("invalid uuid")
		}
	}

	public async searchEvents(search: EventsSearch): Promise<CommunityEvent[]> {
		const where: any = {};
		// validation is for suckers

		let builder = this.connection
            .getRepository(CommunityEvent)
			.createQueryBuilder("evt")
			.leftJoinAndSelect("evt.community", "community");

		if (search.communityId && search.hubId) {
			// this is really just because i'm lazy
			throw new Error(
				"Only one of hub id and community id can be specified",
			);
		}

		if (search.communityId) {
			this.checkBadUuid(search.communityId);
			builder = builder.where("community.id = :id", {
				id: search.communityId,
			});
		}

		if (search.hubId) {
			this.checkBadUuid(search.communityId);
			builder = builder
				.leftJoin("community.hubs", "hub")
				.where("hub.id = :id", { id: search.hubId });
		}
		if (search.minDate) {
			builder = builder.where("evt.startDate >= :startDate", {
				startDate: moment(search.minDate).toISOString(),
			});
		}
		if (search.maxDate) {
			builder = builder.where("evt.endDate <= :endDate", {
				endDate: moment(search.maxDate).toISOString(),
			});
		}

		const ents = await builder
			.select(["evt", "community.name", "community.primaryColor"])
			.getMany();
		return ents;
	}
}