import { gql, GraphQLClient } from 'graphql-request'
import jwt from 'jsonwebtoken';
import { logger } from "../logger";
import axios from 'axios';
import moment from "moment";
import { EventSchema } from '../event-schema';

export interface MeetupClientConfig {
    privateKey: string;
    consumerKey: string;
    authorizedMemberId: string;
    signingKeyId: string;
    proNetwork?: string;
    groupUrls?: string[];
}


export class MeetupClient {
  private client: GraphQLClient;
  private accessToken: String;
  private token;
  constructor(private config: MeetupClientConfig) {
    this.token = this.getJWT()
  }

  private getJWT() {
    const privateKey = this.config.privateKey.replace(/\\n/g, "\n") ?? '';
    const token = jwt.sign(
      {},
      privateKey,
      {
        algorithm: 'RS256',
        issuer: this.config.consumerKey,
        subject: this.config.authorizedMemberId,
        audience: 'api.meetup.com',
        keyid: this.config.signingKeyId,
        expiresIn: 1200
      }
    );
    return token;
  }

  private async getAccessToken(jwt: string) {
    try {
      //set the url
      const tokenUrl = "https://secure.meetup.com/oauth2/access";
      const requestBody = new URLSearchParams();
      requestBody.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer')
      requestBody.append('assertion', jwt)
      const response = await axios.post(tokenUrl, requestBody);
      this.accessToken = response.data.access_token;
      logger.info(`received access token for meetup`)
      return this.accessToken;
    } catch (error) {
      logger.error('Failed to retrieve access token:', error.message);
      throw error;
    }
  }

  private async queryGraphQL(query: any, variables?: any) {
    try {
      this.client = new GraphQLClient("https://api.meetup.com/gql", {
        headers: {
          authorization: `Bearer ${this.accessToken}`,
        },
      })
      const data = await this.client.request(
        query,
        variables,
      );
      return data;
    } catch (error) {
      throw new Error(`GraphQL query failed: ${error.message}`);
    }
  }

  extractEvents(events: any[]): EventSchema[] {
    return events?.map((item) => {
      return {
        id: item.node.id,
        name: item.node.title,
        externalId: item.node.id,  //I've only found one ID
        externalRecurringId: null,
        location: item.node.venue ? item.node.venue.name : '',
        description: item.node.description,
        startDate: moment(item.node.dateTime).toDate(),
        endDate: moment(item.node.endTime).toDate(),
        link: item.node.eventUrl
      };
    });
  }

    async getProNetworkEvents(pronetwork: string) {
      const GET_COMMUNITY_EVENTS = gql`
      query($pronetwork: ID!) {
        proNetwork(id: $pronetwork) {
          eventsSearch(filter: { status: UPCOMING  }, input: {first: 1000}){
            count
            pageInfo {
              endCursor
            }
            edges {
              node {
                id
                title
                eventUrl
                description
                venue {
                  name
                }
                group {
                  name
                  id
                  link
                }
                dateTime
                endTime
              }
            }
          }
        }
      }
      `;
        await this.getAccessToken(this.token);
        const data = await this.queryGraphQL(GET_COMMUNITY_EVENTS, { pronetwork });
        return this.extractEvents(data["proNetwork"].eventsSearch.edges);
    }

    async getCommunityEvents(urlname: string) {
        const GET_GROUP_EVENTS = gql`    
            query($urlname: String!) {
            groupByUrlname(urlname:$urlname){
                id
                name
                upcomingEvents(input:{first:1000}){
                count
                edges {
                    node {
                    id
                    title
                    eventUrl
                    description
                    venue {
                        name
                    }
                    group {
                        name
                        id
                        link
                    }
                    dateTime
                    endTime
                    }
                }
                }
            }
            }
            `;
        await this.getAccessToken(this.token);
        const data = await this.queryGraphQL(GET_GROUP_EVENTS, { urlname });
        return this.extractEvents(data["groupByUrlname"]?.upcomingEvents.edges);
    }

    async getCommunityListEvents(urlnames: string[]) {
        let events: EventSchema[] = [];
        for (const urlname of urlnames) {
            const theseEvents = await this.getCommunityEvents(urlname);
            events.push(...theseEvents);
        }
        return events;
    }

    async getEvents() {
        const proNetworkEvents = await this.getProNetworkEvents(this.config.proNetwork!);
        const communityListEvents = await this.getCommunityListEvents(this.config.groupUrls || []);
        return [...proNetworkEvents, ...communityListEvents];
    }
}
