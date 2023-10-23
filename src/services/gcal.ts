import { calendar_v3, google } from "googleapis";
import { JWT } from "google-auth-library";
import moment from "moment";
import { MemoizeExpiring } from "./memoize";
import {  GaxiosResponse } from "gaxios";
import { EventSchema } from "../event-schema";
import { logger } from "../logger";

export class ServiceAccountCreds {
    clientEmail: string;
    privateKey: string;
    calendarId: string;
    // keyId: string;
}

export class GCalFactory {
    private _jwts: { [key: string]: Promise<JWT | Error> } = {};

    public async create(gcalId: string) {
        const jwt: any = await this.getJwt(gcalId);
        if (jwt.name && jwt.message) {
            logger.error(
                `Issue authenticating. | ${jwt.message}\n stack trace - ${jwt.stack}`
            );
            throw jwt as Error;
        } else {
            return new GCal(jwt as JWT, gcalId);
        }
    }

    private getJwt(gcalId: string): Promise<JWT | Error> {
        // TODO: does this actually protect concurrency? I think so since the promise is immediately
        // returned and not awaited so should still happen on the main node process
        if (!(gcalId in this._jwts)) {
            const jwtProm = this.getServiceAccountCreds(gcalId)
                .then((creds) => {
                    const jwt = new google.auth.JWT(
                        creds.clientEmail,
                        null,
                        creds.privateKey,
                        "https://www.googleapis.com/auth/calendar"
                    );
                    return jwt;
                })
                .catch((e) => {
                    logger.error(
                        `Issue retrieving jwt. | ${e.message}\n stack trace - ${e.stack}`
                    );
                    return e;
                });
            this._jwts[gcalId] = jwtProm;
        }
        return this._jwts[gcalId];
    }

    public async getServiceAccountCreds(
        gcalId: string
    ): Promise<ServiceAccountCreds> {
        // right now this only supports the master service account
        const googleCreds = new ServiceAccountCreds();
        googleCreds.calendarId =
            "ab5hq91hf260porloh3efsmsi8@group.calendar.google.com";
        googleCreds.clientEmail =
            process.env["GOOGLE_CREDENTIALS_CLIENT_EMAIL"];
        // Escape the private key as per
        // https://stackoverflow.com/questions/39492587/escaping-issue-with-firebase-privatekey-as-a-heroku-config-variable
        googleCreds.privateKey = process.env[
            "GOOGLE_CREDENTIALS_PRIVATE_KEY"
        ].replace(/\\n/g, "\n");
        return googleCreds;
    }
}

export class GCal {
    api: calendar_v3.Calendar;
    calendarId: string;
    /**
     *
     */
    constructor(private auth: JWT, calendarId: string) {
        this.calendarId = calendarId;
        this.api = google.calendar({ version: "v3", auth: this.auth });
    }

    @MemoizeExpiring(1000 * 60 * 5) // 5 minutes
    public async listEvents(
        minDate?: moment.MomentInput,
        maxDate?: moment.MomentInput
    ) {
        await this.ensureAuth();
        const timeMin = minDate
            ? moment(minDate).toISOString()
            : moment().subtract(30, "days").toISOString();
        const timeMax = maxDate
            ? moment(maxDate).toISOString()
            : moment().add(60, "days").toISOString();
        let response: GaxiosResponse<calendar_v3.Schema$Event>;
        try {
            response = await this.api.events.list({
                calendarId: this.calendarId,
                singleEvents: true,
                timeMin: timeMin,
                timeMax: timeMax,
            });
        } catch (err) {
            logger.error(
                `Issue listing events | ${err.message}\n stack trace - ${err.stack}`
            );
            throw err;
        }

        // Should extract info and throw here
        if (response.status !== 200) {
            console.log(response);
            this.handleError(response);
            throw new Error(
                `Error with gcal: ${response.status} ${response.data}`
            );
        }
        return this.extractEvents(response.data);
    }

    private async ensureAuth(): Promise<void> {
        try {
            await this.auth.authorize();
        } catch (err) {
            console.log(err);
            throw err;
        }
    }

    extractEvents(data: calendar_v3.Schema$Events): EventSchema[] {
        return data.items.map((item) => {
            return {
                id: item.id,
                name: item.summary,
                externalId: item.id,
                externalRecurringId: item.recurringEventId,
                location: item.location,
                description: item.description,
                startDate: moment(item.start.dateTime).toDate(),
                endDate: moment(item.end.dateTime).toDate(),
                link:
                    this.extractEventLinkFromDesccription(item.description) ||
                    item.htmlLink,
            };
        });
    }

    async patchEvent(events: EventSchema | EventSchema[]): Promise<void> {
        if (Array.isArray(events)) {
            await Promise.all(events.map(this.patchEvent));
            return;
        }

        const evt = events as EventSchema;
        await this.api.events.patch({
            calendarId: this.calendarId,
            eventId: evt.externalId,
            requestBody: {
                summary: evt.name,
                location: evt.location,
                description: evt.description,
                start: { dateTime: evt.startDate.toISOString() },
                end: { dateTime: evt.endDate.toISOString() },
            },
        });
    }

    async createEvent(
        events: EventSchema | EventSchema[]
    ): Promise<calendar_v3.Schema$Event> {
        if (Array.isArray(events)) {
            await Promise.all(events.map(this.createEvent));
            return;
        }

        const evt = events as EventSchema;
        const response = await this.api.events.insert({
            calendarId: this.calendarId,
            requestBody: {
                summary: evt.name,
                location: evt.location,
                description: evt.description,
                // TODO: dynamic timezone
                start: { dateTime: evt.startDate.toISOString() },
                end: { dateTime: evt.endDate.toISOString() },
            },
        });
        // TODO error handling, checking, etc
        return response.data;
    }

    async deleteEvent(googleEventId: string) {
        await this.api.events.delete({
            calendarId: this.calendarId,
            eventId: googleEventId,
        });
    }

    private handleError(response: GaxiosResponse<calendar_v3.Schema$Events>) {
        logger.error(
            `Error in gaxios | ${response.status} | ${JSON.stringify(
                response.data
            )}`
        );
    }

    private extractEventLinkFromDesccription(description) {
        if (!description) {
            return null;
        }
        // Try to extract form a meetup link
        const regex = /(https?:\/\/([a-zA-Z\d-]+\.){0,}meetup\.com(\/.*)?)/;
        let result = description.match(regex);
        if (result) {
            return result[0];
        }

        // Try to match any url
        const backupRegex =
            /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
        result = description.match(backupRegex);
        if (result) {
            return result[0];
        } else {
            return null;
        }
    }
}
