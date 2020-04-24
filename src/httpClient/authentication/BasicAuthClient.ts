import {IAuthClient} from "./IAuthClient";


/**
 * Auth client providing "Basic" authentication using base64-encoded
 * credentials.
 */
export class BasicAuthClient implements IAuthClient {
    private readonly authHeader: { Authorization: string };


    constructor(userName: string, password: string) {
        this.authHeader = BasicAuthClient.generateAuthHeader(userName, password);
    }


    async refreshToken(): Promise<void> {
        // no-op
    }


    async getAuthHeader(): Promise<object> {
        return this.authHeader;
    }


    /**
     * Generates a header object for basic authorization
     * (base64-encoded userid / password).
     */
    static generateAuthHeader(userName: string, password: string): { Authorization: string } {
        const credentials = BasicAuthClient.encodeBase64(userName + ":" + password);
        const headerValue = `Basic ${credentials}`;
        return {Authorization: headerValue};
    }

    /**
     * Encodes a string as base64 text.
     */
    static encodeBase64(b: string): string {
        return Buffer.from(b, "binary").toString("base64");
    }
}
