import { Locale } from "./Locale";

export interface Group {
    id: string;
    name: string;
    externalUrl?: string | null;
    description: string;
    logoUrl: string | null;
    primaryColor: string;
    locale: Locale | null;
}
