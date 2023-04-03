import Webflow from 'webflow-api';
import Bottleneck from 'bottleneck';
import { EventsQuery } from './services/events';
import { getDatasource } from './db';
import { CommunityEvent } from './entity/CommunityEvent';


interface CMSItem {
	collectionId: string;
	fields: {
		name: string;
		slug: string;
		'event-date-start': string;
		'event-date-time-end': string;
		'summary-of-the-event': string;
		'full-description': string;
		'event-signup-link': string;
		'event-organizer': string;
		'event-featured-color': string;
		_archived: boolean;
		_draft: boolean;
	};
}

export async function syncWebflow() {

	const webflow = new Webflow({ token: process.env.WEBFLOW_TOKEN });
	const connection = await getDatasource();
	const repo = connection.getRepository(CommunityEvent);


	async function syncItem(cmsItem: CMSItem) {
		try {
			const res = await webflow.createItem(cmsItem);
			return { ok: true, id: res._id, err: null };
		} catch (err) {
			console.log(err);
			return { ok: false, id: null, err: err };
		}
	}


	try {
		const query = new EventsQuery(repo);
		const sd = new Date( new Date().setFullYear(new Date().getFullYear() - 1)).toISOString();
		const ed = new Date( new Date().setFullYear(new Date().getFullYear() + 1)).toISOString();

		const events = await query.search({minDate: sd, maxDate: ed});

		const limiter = new Bottleneck({
			minTime: 1000
		});

		const existing_items = await webflow.items({
			collectionId: process.env.EVENTS_COLLECTION_ID,
		});

		const existing_by_name = new Set(existing_items.map(x => x.name));

		const cmsItems: CMSItem[] = [];
		for (let i = 0; i < events.length; i++) {
			let evt = events[i];
			if (existing_by_name.has(evt.name)) continue;
			const cmsItem = createCMSItem(evt);
			cmsItems.push(cmsItem);
		}

		const resArr = await limiter.schedule(() => {
			const allTasks = cmsItems.map(item => syncItem(item));
			return Promise.all(allTasks);
		});

		try {
			const itemIds = resArr.map(x => x.id);
			await webflow.publishItems({
				collectionId: process.env.EVENTS_COLLECTION_ID,
				itemIds: itemIds,
				live: true
			});
			// await webflow.publishSite({
			// 	siteId: process.env.WEBFLOW_SITE_ID!,
			// 	domains: [
			// 		process.env.WEBFLOW_SITE_SUBDOMAIN!,
			// 	],
			// });
		} catch (err) {
			return {
				message: "Error occured publishing site, items only staged",
				error: err
			};
		}

		let success = 0;
		const messages = [];
		for (let i = 0; i < resArr.length; i++) {
			success += (resArr[i].ok ? 1 : 0);
			if (!resArr[i].ok) {
				messages.push(resArr[i].err.message)
			}
		}

		return {
			message: `Synced ${resArr.length} events with ${success} completions and ${resArr.length - success} failures.`,
			error: null
		};
	} catch (err) {
		console.log(err);
		return { message: 'Critical error occured', error: err }
	}
};

function createCMSItem(evt: CommunityEvent): CMSItem {
	const name = evt.name;
	const slug = str_to_slug(name);
	const startDate = evt.startDate;
	const endDate = evt.endDate;
	const description = evt.description;
	const link = evt.link;
	const community = evt.community.name;
	const primaryColor = evt.community.primaryColor;

	return {
		collectionId: process.env.EVENTS_COLLECTION_ID!,
		fields: {
			name: name,
			slug: slug,
			'event-date-start': startDate.toISOString(),
			'event-date-time-end': endDate.toISOString(),
			'summary-of-the-event': description,
			'full-description': description,
			'event-signup-link': link,
			'event-organizer': community,
			'event-featured-color': primaryColor,
			_archived: false,
			_draft: false,
		}
	};

}


const str_to_slug = (str: string): string => {
	str = str.replace(/^\s+|\s+$/g, '');
	str = str.toLowerCase();
	var from = 'àáäâèéëêìíïîòóöôùúüûñç·/_,:;';
	var to = 'aaaaeeeeiiiioooouuuunc------';
	for (var i = 0, l = from.length; i < l; i++)
		str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));

	str = str
		.replace(/[^a-z0-9 -]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-');

	return str;
};

// sync();