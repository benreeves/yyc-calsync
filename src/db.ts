import { DataSource } from "typeorm";
import { AppUser } from "./entity/AppUser";
import { Community } from "./entity/Community";
import { CommunityEvent } from "./entity/CommunityEvent";
import { Connector } from "./entity/Connector";
import { ExternalResource } from "./entity/ExternalResource";
import { Hub } from "./entity/Hub";
import { HubEventXref } from "./entity/HubEventXref";
import { Locale } from "./entity/Locale";
import { Opportunity } from "./entity/Opportunity";
import { Sponsor } from "./entity/Sponsor";
import { CommunityTag, EventTag, HubTag, OpportunityTag, Tag } from "./entity/Tag";
import { UserProfile } from "./entity/UserProfile";
import { CommunityContact, Contact, HubContact, SponsorContact } from "./entity/Contact";

const entities = [
	AppUser,
	Community,
	CommunityEvent,
	Connector,
	Contact,
	SponsorContact,
	CommunityContact,
	HubContact,
	ExternalResource,
	Hub,
	HubEventXref,
	Locale,
	Opportunity,
	Sponsor,
	Tag,
	OpportunityTag,
	CommunityTag,
	EventTag,
	HubTag,
	UserProfile
]
let ds: DataSource = null;
export async function initialize() {
	ds = new DataSource({
		type: "postgres",
		host: process.env.TYPEORM_HOST,
		port: 5432,
		username: process.env.TYPEORM_USERNAME,
		password: process.env.TYPEORM_PASSWORD,
		database: process.env.TYPEORM_DATABASE,
		synchronize: true,
		entities: entities,
		logging: false
	});
	await ds.initialize();

}
export async function getDatasource() {
	if (ds == null) {
		throw new Error("Must call initialize");
	}
	return ds
}
