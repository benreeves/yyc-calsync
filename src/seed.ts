import "reflect-metadata";
import {  DataSource } from "typeorm";
import { AppUser } from "./entity/AppUser";
import { CalendarSyncBehaviour, Community } from "./entity/Community";
import { CommunityContact } from "./entity/Contact";
import { Hub } from "./entity/Hub";
import { Locale } from "./entity/Locale";
import { MeetupPage, SlackChannel } from "./entity/ExternalResource";
import { Opportunity } from "./entity/Opportunity";
import { Sponsor } from "./entity/Sponsor";
import { CommunityTag, HubTag, OpportunityTag } from "./entity/Tag";
import { logger } from "./logger";

const calgary = new Locale();
calgary.city = "Calgary";
calgary.province = "Alberta";
calgary.country = "Canada";

const categories = {
    Data: "Data",
    Dev: "Software Dev",
    Social: "Social Good",
    Tech: "Tech",
    Product: "Product",
    Women: "Women",
    Design: "Design",
    Startup: "Startup",
    AI: "AI",
};
const hubTagMap = {
    data: new HubTag({ value: categories.Data }),
    dev: new HubTag({ value: categories.Dev }),
    socialChange: new HubTag({ value: categories.Social }),
    startup: new HubTag({ value: categories.Startup }),
    tech: new HubTag({ value: categories.Tech }),
    women: new HubTag({ value: categories.Women }),
    product: new HubTag({ value: categories.Product }),
};
const hubTags = Object.values(hubTagMap);

const yycData = new Hub({
    name: "YYC Data Community",
    description: "Calgary's home for data science",
    externalUrl: "https://www.yycdata.ca",
    logoUrl: "/YYCDataSociety_Logo.svg",
    googleCalendarId: "lj6qerk7clk4g6aba4p0gf38vs@group.calendar.google.com",
    primaryColor: "#0082d9",
    locale: calgary,
    tags: [hubTagMap.data, hubTagMap.tech],
});

const yycdev = new Hub({
    name: "YYC Developer Community",
    description: "Calgary's home for software geeks",
    externalUrl: null,
    logoUrl: "/YYCDataSociety_Logo.svg",
    googleCalendarId: null,
    locale: calgary,
    tags: [hubTagMap.dev, hubTagMap.tech],
});

const techForGood = new Hub({
    name: "Tech for Good",
    description: "We apply the power of tech to social change",
    externalUrl: null,
    logoUrl: null,
    googleCalendarId: null,
    locale: calgary,
    tags: [hubTagMap.socialChange, hubTagMap.tech],
});

const platform = new Hub({
    name: "Platform Calgary",
    description: "We do things! And stuff!",
    externalUrl: "https://www.platformcalgary.com/",
    logoUrl:
        "https://www.platformcalgary.com/public/images/logo-platform-calgary.svg",
    googleCalendarId: null,
    locale: calgary,
    children: [yycdev, yycData, techForGood],
    tags: [hubTagMap.startup, hubTagMap.tech],
});

const startAB = new Hub({
    name: "Start Alberta",
    description: "Empowering Albertan startups",
    externalUrl: "https://startalberta.com/",
    logoUrl: null,
    googleCalendarId: null,
    locale: calgary,
    children: [platform],
    tags: [hubTagMap.startup],
});

const hubs = [yycData, yycdev, platform, techForGood, startAB];

const communityTags = {
    data: new CommunityTag({ value: categories.Data }),
    tech: new CommunityTag({ value: categories.Tech }),
    dev: new CommunityTag({ value: categories.Dev }),
    ai: new CommunityTag({ value: categories.AI }),
    uiux: new CommunityTag({ value: categories.Design }),
    women: new CommunityTag({ value: categories.Women }),
    product: new CommunityTag({ value: categories.Product }),
    startup: new CommunityTag({ value: categories.Startup }),
    socialGood: new CommunityTag({ value: categories.Social }),
};

const communityTagArr = Object.values(communityTags);

const yycdata = new Community({
    name: "YYC Data Society",
    description: "Calgary's home for data science",
    externalUrl: "https://www.yycdata.ca",
    logoUrl: "/YYCDataSociety_Logo.svg",
    locale: calgary,
    googleCalendarId: "3dtb5r1p3t4lqutirpuljid52g@group.calendar.google.com",
    primaryColor: "#0082d9",
    hubs: [yycData],
    tags: [communityTags.data, communityTags.ai],
});

const calgaryai = new Community({
    name: "Calgary AI",
    calendarSyncBehaviour: CalendarSyncBehaviour.NODELETE,
    description:
        "We listen to speakers discuss artificial intelligence, machine learning, and data science, and we also learn from each other. The content is varied, approachable, and valuable, no matter your level of expertise! Open to all.",
    externalUrl: "https://www.meetup.com/calgary-ai",
    googleCalendarId:
        "lu9999kq2us5fu81afo3gdvq3pinjl34@import.calendar.google.com",
    locale: calgary,
    hubs: [yycData],
    tags: [communityTags.data, communityTags.ai],
    logoUrl:
        "https://secure.meetupstatic.com/photos/event/5/c/f/3/highres_464363795.jpeg",
});

const dfg = new Community({
    name: "Data for Good",
    description: `Data For Good is a collective of volunteer do-gooders,
who want to use their powers for good to help make our communities better through data. 
We help nonprofit and social organizations harness the power of their data through analytics 
and visualizations in order to leverage their impact in the community.`,
    externalUrl: "https://www.meetup.com/Data-For-Good-Calgary/",
    googleCalendarId:
        "8ihpm8js1112hqmdshfat8414vcgbf98@import.calendar.google.com",
    calendarSyncBehaviour: CalendarSyncBehaviour.NODELETE,
    locale: calgary,
    hubs: [yycData, techForGood],
    logoUrl:
        "https://secure.meetupstatic.com/photos/event/4/8/e/6/highres_479478662.jpeg",
    primaryColor: "#78be28",
    tags: [communityTags.data, communityTags.socialGood],
});

const civicTech = new Community({
    name: "CivicTech YYC",
    description: `CivicTechYYC is a community based group that is part of a global movement to leverage technology for public good.`,
    externalUrl:
        "https://www.meetup.com/CivicTechYYC-Tech-for-Good/events/calendar/",
    googleCalendarId:
        "0m8i8fomirn72b97e6gf7j2psoi5hn77@import.calendar.google.com",
    calendarSyncBehaviour: CalendarSyncBehaviour.NODELETE,
    locale: calgary,
    hubs: [techForGood],
    logoUrl:
        "https://secure.meetupstatic.com/photos/event/4/8/e/6/highres_479478662.jpeg",
    primaryColor: "#78be28",
    tags: [communityTags.socialGood],
});

const pydata = new Community({
    name: "PyData",
    calendarSyncBehaviour: CalendarSyncBehaviour.NODELETE,
    googleCalendarId:
        "90s98s3rfdp5fu0j9fogqjkp30ltshq1@import.calendar.google.com",
    externalUrl: "https://www.meetup.com/PyData-Calgary/",
    logoUrl:
        "https://secure.meetupstatic.com/photos/event/d/0/9/a/highres_447653402.jpeg",
    description: `PyData is a practitioner oriented meetup focused on 
learning data science by doing with workshops, code examples, and real life
examples. Python oriented but non-exclusive`,
    primaryColor: "#ed9042",
    hubs: [yycData],
    locale: calgary,
    tags: [communityTags.data, communityTags.dev],
});

const calr = new Community({
    name: "Calgary R",
    calendarSyncBehaviour: CalendarSyncBehaviour.NODELETE,
    googleCalendarId:
        "smuer5qbtn33qjlh3dtvpbas5kudc048@import.calendar.google.com",
    externalUrl: "https://www.meetup.com/calgaryr/",
    logoUrl:
        "https://secure.meetupstatic.com/photos/event/3/e/5/b/highres_436335963.jpeg",
    description: `CalgaryR is a community of R users living in Calgary. 
This community aims to get people together from industry and academia in 
order to share experience for various statistical and analytical tasks using R`,
    hubs: [yycData],
    locale: calgary,
    tags: [communityTags.data],
});

const women = new Community({
    name: "Women in Data",
    calendarSyncBehaviour: CalendarSyncBehaviour.NODELETE,
    googleCalendarId:
        "b9sgnavfd8mglk9qus6vcc52gdn2oup1@import.calendar.google.com",
    externalUrl: "https://www.meetup.com/Women-In-Data-Calgary/",
    logoUrl:
        "https://secure.meetupstatic.com/photos/event/6/d/e/b/highres_482428139.jpeg",
    description: `The Calgary chapter of Women in Data aims to be a space where women
working in data science can connect and learn. We will go in depth into case studies
and encourage members to put forth questions related to their work. We also want to grow support for women in tech 
entrepreneur spaces and promote the tech sector in Calgary.`,
    hubs: [yycData],
    primaryColor: "#d2f1eb",
    locale: calgary,
    tags: [communityTags.data, communityTags.women],
});

const untappd = new Community({
    name: "Untapped Energy",
    calendarSyncBehaviour: CalendarSyncBehaviour.NODELETE,
    googleCalendarId:
        "n07a659vf3raa9m69h4a0a050st0uusi@import.calendar.google.com",
    externalUrl: "https://www.meetup.com/untappedenergy/",
    logoUrl:
        "https://secure.meetupstatic.com/photos/event/b/5/7/6/highres_477046454.jpeg",
    description: `A community for data enthusiasts in the oil and gas industry.`,
    hubs: [yycData],
    locale: calgary,
    primaryColor: "#036360",
    tags: [communityTags.data],
});

const ada = new Community({
    calendarSyncBehaviour: CalendarSyncBehaviour.NODELETE,
    name: "Alberta Data Architecture",
    googleCalendarId:
        "t1gj79urviiqbpec8rtaec6ch6k78nl0@import.calendar.google.com",
    externalUrl: "http://albertadataarchitecture.org/",
    logoUrl:
        "https://secure.meetupstatic.com/photos/event/6/5/9/f/highres_484466015.jpeg",
    description: `The Alberta Data Architecture (ADA) Community is an informal organization of data professionals that meet
regularly to discuss matters of interest to the data community, and to network with like-minded individuals.`,
    hubs: [yycData],
    locale: calgary,
    tags: [communityTags.data],
});

const dama = new Community({
    name: "DAMA",
    googleCalendarId: "info.dama.calgary@gmail.com",
    externalUrl: "http://www.dama-calgary.org/",
    logoUrl: "/DAMALogo.png",
    description: `DAMA's mission is to provide a non-profit, vendor-independent association where data professionals 
can go for help and assistance. They aim to To provide the best practice resources such as the DMBoK 
and DM Dictionary of Terms in a mechanism that reaches as many DM professionals as possible and
to create a trusted environment for DM professionals to collaborate and communicate.
They meet the 3rd Thursday of the month at 8AM.
`,
    hubs: [yycData],
    locale: calgary,
    primaryColor: "#003469",
    tags: [communityTags.data],
});

const yycdev_community = new Community({
    name: "YYC Dev",
    calendarSyncBehaviour: CalendarSyncBehaviour.NODELETE,
    googleCalendarId: null,
    externalUrl: "https://www.meetup.com/YYC-dev/",
    logoUrl:
        "https://secure.meetupstatic.com/photos/event/5/0/c/e/600_486500686.jpeg",
    description: `We are a technical meetup group from Calgary, Alberta Canada that meets monthly to connect, learn, and grow as a technical community.
Every month, YYC Dev gathers from the farthest-reaching corners of Calgary's tech-sphere to discuss, learn, share, innovate, and connect fellow developers with one another in a meetup that focuses on building communities and developing software.`,
    hubs: [yycdev],
    locale: calgary,
    tags: [communityTags.dev],
});

const productCal = new Community({
    name: "Product Calgary",
    calendarSyncBehaviour: CalendarSyncBehaviour.NODELETE,
    googleCalendarId: null,
    externalUrl: "https://productcalgary.nationbuilder.com/",
    logoUrl:
        "https://media-exp1.licdn.com/dms/image/C560BAQEDJKZTlfUc4w/company-logo_200_200/0/1550339371101?e=2159024400&v=beta&t=ik5vSe-iG6TBbbE_0nPpp_bvd--04u_flTgDk3IDbf8",
    description:
        "Product Calgary (formerly the “Calgary Product Managers Meetup”) is a group of product managers passionate about growing professionally, networking with other product managers, and building the professional community here in Calgary.  ",
    hubs: [platform],
    tags: [communityTags.product],
    locale: calgary,
});

const calgaryUX = new Community({
    name: "Calgary UX",
    calendarSyncBehaviour: CalendarSyncBehaviour.NODELETE,
    googleCalendarId: null,
    externalUrl: "http://calgaryux.com/",
    logoUrl:
        "https://secure.meetupstatic.com/photos/event/d/5/c/0/600_490314720.jpeg",
    description:
        "We are a community of over 1,500 user experience professionals working together to bring value, empathy and design expertise to everyone around us.",
    hubs: [platform],
    locale: calgary,
    tags: [communityTags.uiux, communityTags.product],
});

const pyyyc = new Community({
    name: "Python YYC",
    calendarSyncBehaviour: CalendarSyncBehaviour.NODELETE,
    googleCalendarId: null,
    externalUrl: "https://www.meetup.com/py-yyc/",
    logoUrl:
        "https://secure.meetupstatic.com/photos/event/6/8/b/600_493141675.jpeg",
    description:
        "Meet fellow Calgarians interested in Python! Would you like to learn Python, and get into the field? Do you use Python, and want to advance your knowledge? Have you built something interesting in Python, or figured out something tricky, that you want to share with others? Do you just want to chat?",
    hubs: [yycdev],
    locale: calgary,
    tags: [communityTags.dev],
});

const yycjs = new Community({
    name: "YYC.js",
    calendarSyncBehaviour: CalendarSyncBehaviour.NODELETE,
    googleCalendarId: null,
    externalUrl: "https://yycjs.com/",
    logoUrl:
        "https://secure.meetupstatic.com/photos/event/6/9/d/1/600_449127089.jpeg",
    description:
        "YYC.js is comprised of a group of Calgary web developers and JavaScript aficionados with a passion for open source software. Our passion for software written in JavaScript stems from the ability to be extremely creative due to JavaScript's flexible nature.",
    hubs: [yycdev],
    locale: calgary,
    tags: [communityTags.dev],
});

const dotnet = new Community({
    name: "Calgary .NET Users Group",
    calendarSyncBehaviour: CalendarSyncBehaviour.NODELETE,
    googleCalendarId: null,
    externalUrl: "https://yycjs.com/",
    logoUrl:
        "https://secure.meetupstatic.com/photos/event/c/4/5/3/600_451430259.jpeg",
    description:
        "The Calgary .NET User Group exists to foster the use and education of the Microsoft .NET platform in Calgary. Anyone can participate in the group, from those that are experienced in .NET to those just starting out.",
    hubs: [yycdev],
    locale: calgary,
    tags: [communityTags.dev],
});

const calgaryagile = new Community({
    name: "Calgary Agile Methods User Group",
    calendarSyncBehaviour: CalendarSyncBehaviour.NODELETE,
    googleCalendarId: null,
    externalUrl: "https://www.calgaryagile.com/",
    logoUrl: "https://www.calgaryagile.com/images/calgary-agile-logo.gif",
    description:
        "The Calgary Agile Methods User Group is a meetup group that provides a focal point for the use of agile methods in software development organizations in Calgary.",
    hubs: [platform],
    locale: calgary,
    tags: [communityTags.product],
});

const sdc = new Community({
    name: "Software Developers of Calgary Learning Together",
    calendarSyncBehaviour: CalendarSyncBehaviour.NODELETE,
    googleCalendarId: null,
    externalUrl: "https://sdc.fyi/",
    logoUrl: "https://sdc.fyi/static/media/sdc_logo_bold.7f8f9c7d.jpg",
    description:
        "We are now an organization of software developers growing as quickly as we are able. But primarily we host monthly mini-hackathons where we spend a day coding in groups, then towards the end of the day we share what we've learned!",
    hubs: [yycdev],
    locale: calgary,
    tags: [communityTags.dev],
});

const rainforest = new Community({
    name: "Rainforest",
    calendarSyncBehaviour: CalendarSyncBehaviour.NODELETE,
    googleCalendarId: null,
    externalUrl: "https://www.rainforestab.ca/",
    logoUrl:
        "https://www.rainforestab.ca/uploads/2/5/8/5/25857996/published/image001.jpg?1583259795",
    description:
        "Rainforest Alberta is a movement of people working together to improve Alberta’s innovation ecosystem. We believe the province has the right ingredients necessary to be fertile ground for growing innovative ideas into sustainable, globally competitive ventures",
    hubs: [platform],
    locale: calgary,
    tags: [communityTags.tech],
});

const toSeed: Community[] = [
    yycdata,
    calgaryai,
    dfg,
    pydata,
    women,
    untappd,
    calr,
    ada,
    dama,
    civicTech,
    yycdev_community,
    productCal,
    calgaryUX,
    pyyyc,
    yycjs,
    dotnet,
    calgaryagile,
    sdc,
    rainforest,
];

const ben = new AppUser();
ben.firstName = "Ben";
ben.lastName = "Reeves";
ben.email = "breeves997@gmail.com";
ben.emailNormalized = "BREEVES997@GMAIL.COM";
ben.emailConfirmed = true;

const benContact = new CommunityContact();
benContact.name = "Ben Reeves";
benContact.community = pydata;
benContact.email = "breeves997@gmail.com";
benContact.isPrimary = true;

/////////////////////////////////
// Opportunities
const oppTags = [
    new OpportunityTag({ value: "conference" }),
    new OpportunityTag({ value: "speaking" }),
    new OpportunityTag({ value: "development" }),
    new OpportunityTag({ value: "ml" }),
    new OpportunityTag({ value: "intermediate skill" }),
    new OpportunityTag({ value: "all skills" }),
];

const oppotunities = [
    new Opportunity({
        type: "volunteer",
        title: "Volunteer at YYC DataCon",
        description:
            "The YYC DataCon is looking for volunteers to help act as community liasons and points of contact for the day of the event",
        hub: yycData,
        tags: [oppTags[0]],
    }),
    new Opportunity({
        type: "volunteer",
        title: "Web Developers Needed",
        description:
            "Web devs needed to help build out the hubsuite community management application!",
        hub: yycData,
        tags: [oppTags[2]],
    }),
    new Opportunity({
        type: "volunteer",
        title: "Speak at YYC DataCon",
        description:
            "YYC DataCon is looking for speakers! Do you have what it takes?",
        hub: yycData,
        tags: [oppTags[0], oppTags[1]],
    }),
    new Opportunity({
        type: "job",
        title: "ML Developer at Viewpoint Investment Partners",
        description:
            "Looking to build cutting edge financial machine learning models that beat the market? Join us at VIP!",
        hub: yycData,
        tags: [oppTags[3], oppTags[4]],
    }),
    new Opportunity({
        type: "volunteer",
        title: "June Speaker for PyData",
        description: "We need a speaker! You can do it!",
        hub: yycData,
        tags: [oppTags[1], oppTags[5]],
    }),
];
/////////////////////////////////

/////////////////////////////////
// Sponsors
const sponsors = [
    new Sponsor({
        name: "Platform Calgary",
        url: "https://www.platformcalgary.com/",
        logoUrl:
            "https://www.platformcalgary.com/public/images/logo-platform-calgary.svg",
        featured: true,
        hub: yycData,
    }),
    new Sponsor({
        name: "AltaML",
        url: "https://www.altaml.com/",
        logoUrl:
            "https://www.altaml.com/assets/img/altaml/altaml-logo-white.png",
        featured: true,
        hub: yycData,
    }),
];
/////////////////////////////////

/////////////////////////////////
// External Resources
const resources = [
    new SlackChannel({
        name: "Calgary AI Slack",
        url: "yyc-ai.slack.com",
        community: calgaryai,
    }),
    new SlackChannel({
        name: "YYC Data Slack",
        url: "yycdatacommunity.slack.com",
        community: yycdata,
    }),
    new SlackChannel({
        name: "Calgary R Slack",
        url: "yyc-r.slack.com",
        community: calr,
    }),
    new MeetupPage({
        name: "Calgary AI Meetup",
        url: "https://www.meetup.com/calgary-ai",
        community: calgaryai,
    }),
    new MeetupPage({
        name: "Calgary R Meetup",
        url: "https://www.meetup.com/calgaryr/",
        community: calr,
    }),
    new MeetupPage({
        name: "PyData Meetup",
        url: "https://www.meetup.com/PyData-Calgary/",
        community: pydata,
    }),
];
/////////////////////////////////

export const seedData = {
    users: [ben],
    hubTags: hubTags,
    hubs: hubs,
    communityTags: communityTagArr,
    communities: toSeed,
    communityContacts: [benContact],
    resources: resources,
    oppTags: oppTags,
    opportunities: oppotunities,
    sponsors: sponsors,
};


export async function seed(connection: DataSource) {
    logger.info("Seeding database");
    try {
        logger.info("Inserting a new user into the database...");
        await connection.manager.save(seedData.users);

        logger.info("Saving hubs");
        await connection.manager.save(seedData.hubTags);
        await connection.manager.save(seedData.hubs);

        logger.info("Saving communities");
        await connection.manager.save(seedData.communityTags);
        await connection.manager.save(seedData.communities);
        await connection.manager.save(seedData.communityContacts);

        logger.info("Saving opportunities");
        await connection.manager.save(seedData.oppTags);
        await connection.manager.save(seedData.opportunities);

        logger.info("Saving sponsors");
        await connection.manager.save(seedData.sponsors);

        logger.info("Saving resources");
        await connection.manager.save(seedData.resources);
    } catch (error) {
        return logger.error(error);
    }
}

/**
 * Returns the entites of the database
 */
export async function getEntities(connection: DataSource) {
    const entities = [];
    (await connection.entityMetadatas).forEach((x) =>
        entities.push({ name: x.name, tableName: x.tableName })
    );
    return entities;
}

/**
 * Cleans all the entities
 */
export async function cleanAll(entities, connection: DataSource) {
    try {
        for (const entity of entities) {
            const repository = await connection.getRepository(entity.name);
            await repository.query(`DELETE FROM ${entity.tableName};`);
        }
    } catch (error) {
        throw new Error(`ERROR: Cleaning test db: ${error}`);
    }
}

export async function resetDb(connection: DataSource) {
    logger.info("Resetting database");
    try {
        logger.info("Fetching all entities");
        const entities = await getEntities(connection);
        logger.info("Deleting all entities");
        await cleanAll(entities, connection);
        logger.info("Cleared all entities");
    } catch (err) {
        console.log(err);
    }
}
