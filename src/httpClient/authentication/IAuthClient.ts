/**
 * Performs token-based authentication with a 3rd party provider.
 */
export interface IAuthClient {

    /**
     * Asynchronously refreshes the token. This sets the
     * token promise of the client.
     * @returns {Promise<void>}
     */
    refreshToken(): Promise<void>;

    /**
     * Updates the header to be sent with an HTTP
     * request in order to provide authentication.
     */
    getAuthHeader(): Promise<object>;
}

