import { RetryStrategy } from "./RetryStrategy";
import { IAuthClient } from "./authentication";

/**
 * Options for the HTTP client.
 */
export interface HttpClientOptions {
    /**
     * Timeout of the HTTP client in case the response is returned
     * in time. Defaults to 10000 (ms).
     */
    timeout?: number;
    /**
     * The maximum number of attempts until the client gives up. Defaults to 3 (2 retries).
     */
    maxAttempts?: number;
    /**
     * The default base delay between retry attempts. Defaults to 1000 (ms).
     */
    retryDelay?: number;
    /**
     * The delay strategy - defaults to exponential retries.
     */
    retryStrategy?: RetryStrategy;

    /**
     * Optional authentication strategy. Invoked whenever an API call returns an HTTP 401.
     */
    authClient?: IAuthClient;

    /**
     * Optional custom headers to be included in every call.
     */
    customHeaders?: any;
}
