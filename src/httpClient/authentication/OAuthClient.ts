import { ApiResponse } from "../ApiResponse";
import axios, { AxiosInstance, AxiosResponse } from "axios";
import { IAuthClient } from "./IAuthClient";


/**
 * Client to perform an OAuth client credentials grant.
 */
export interface OAuthClientOptions {
    /**
     * Request URI to be used. For Auth0, this follows the scheme 'https://baseUri/oauth/token'.
     */
    tokenRequestUri: string;

    /**
     * Client credentials login ID.
     */
    clientId: string;

    /**
     * Client credentials secret.
     */
    secret: string;

    /**
     * Optional targeted audience to be submitted along with the token request.
     */
    audience?: string;
}

/**
 * Provides client-credentials authentication with OAuth endpoints to fetch auth tokens.
 * See https://www.oauth.com/oauth2-servers/access-tokens/client-credentials/
 */
export class OAuthClient implements IAuthClient {
    private token: Promise<string> = undefined;
    client: AxiosInstance;


    constructor(private options: OAuthClientOptions) {
        const headers = {
            "Content-type": "application/x-www-form-urlencoded",
        };

        const config = {
            baseURL: options.tokenRequestUri,
            timeout: 5000,
            headers,
            validateStatus: (status) => {
                return status >= 200; // accept all responses
            },
        };

        this.client = axios.create(config);
    }


    public async getAuthHeader(): Promise<object> {

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


    public async refreshToken(): Promise<void> {
        const promise = this.refreshTokenImpl();
        this.token = promise;
        await promise;
    }


    public async refreshTokenImpl(): Promise<string> {

        const response: ApiResponse = await this.getToken();
        if (response.success) {
            // parse the returned payload
            const json: any = await response.response.data;
            const token = json && json.access_token;
            if (token) {
                return token;
            }

            throw new Error("Token fetch error - no 'access_token' found in resolved JSON: " + JSON.stringify(json),
            );
        } else {
            throw new Error("Token fetch error: " + response.getErrorMessage());
        }
    }


    /**
     * Sends an HTTP POST to get a new token.
     */
    private async getToken(): Promise<ApiResponse> {
        const { audience, clientId, secret } = this.options;

        const headers = {
            "Content-type": "application/x-www-form-urlencoded",
        };

        let body = `grant_type=client_credentials&client_id=${clientId}&client_secret=${secret}`;
        if (audience) {
            body += `&audience=${audience}`;
        }

        const request = {
            method: "POST" as any,
            headers,
            data: body,
        };

        // send request and wrap in a response
        const response: AxiosResponse = await this.client.request(request);
        return new ApiResponse(response, undefined, 0);
    }
}
