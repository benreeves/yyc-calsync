import moment from "moment";
import { CommunityEvent } from "../entity/CommunityEvent";
import { DataSource, Repository } from "typeorm";

export class EventsSearch {
	hubId?: string;
	communityId?: string;
	minDate?: string;
	maxDate?: string;
}

export class EventsQuery {
	/**
	 *
	 */
	constructor(
		private repo: Repository<CommunityEvent>
	) { }

	protected checkBadUuid(uuid: string): void {

		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(uuid)) {
			throw new Error("invalid uuid")
		}
	}

	public async search(search: EventsSearch): Promise<CommunityEvent[]> {
		const where: any = {};
		// validation is for suckers

		let builder = this.repo
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
