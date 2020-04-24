import { IAuthClient } from "./IAuthClient";

/**
 * Provides simple Bearer token authentication through delegation.
 */
export class DelegateBearerAuthClient implements IAuthClient {
    private token: Promise<string> = undefined;

    constructor(private tokenResolver: () => Promise<string>) {}

    async getAuthHeader(): Promise<object> {
        if (!this.token) {
            await this.refreshToken();
        }

        // await the auth token if it's not ready yet.
        // if the promise fails, this will fail
        const token: string = await this.token;
        if (token) {
            return { Authorization: "Bearer " + token };
        } else {
            // no token available
            console.warn("No bearer token available.");
            return undefined;
        }
    }

    async refreshToken(): Promise<void> {
        const promise: Promise<string> = this.tokenResolver();
        this.token = promise;
        await promise;
    }
}
