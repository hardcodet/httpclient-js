import { ApiResponse } from "./ApiResponse";
import { ApiResult } from "./ApiResult";
import { IJsonProcessor } from "./IJsonProcessor";
import axios, { AxiosInstance, AxiosResponse } from "axios";
import { HttpClientOptions } from "./HttpClientOptions";
import { RetryStrategy } from "./RetryStrategy";

/**
 * HTTP / API client.
 */
export class HttpClient {
    private baseUri: string;
    private customHeaders: any;
    private client: AxiosInstance;
    private options: HttpClientOptions;

    public inboundProcessors: IJsonProcessor[] = [];
    public outboundProcessors: IJsonProcessor[] = [];

    constructor(baseUri: string = "", options?: HttpClientOptions) {
        const defaultOptions: HttpClientOptions = {
            timeout: 10000,
            maxAttempts: 3,
            retryDelay: 1000,
            retryStrategy: RetryStrategy.Exponential,
            authClient: undefined,
            customHeaders: undefined,
        };

        // merge with default options
        this.options = { ...defaultOptions, ...options };

        this.baseUri = baseUri;
        this.customHeaders = this.options.customHeaders;
        this.setInstance();
    }

    private setInstance() {
        const headers = this.customHeaders;

        const config = {
            baseURL: this.baseUri,
            timeout: this.options.timeout,
            headers,
            validateStatus: (status) => {
                return status >= 200; // accept all responses
            },
        };

        this.client = axios.create(config);
    }

    setCustomHeaders(headers: any) {
        this.customHeaders = headers;
        this.setInstance();
    }

    get(uri, headers?): Promise<ApiResponse> {
        return this._invoke("GET", uri, null, headers);
    }

    async getAs<T>(uri: string, headers?): Promise<ApiResult<T>> {
        const response = await this.get(uri, headers);
        return this.parseResultInternal<T>(response);
    }

    post(uri, data?, headers?): Promise<ApiResponse> {
        return this._invoke("POST", uri, data, headers);
    }

    async postAs<T>(uri: string, data?, headers?): Promise<ApiResult<T>> {
        const response = await this.post(uri, data, headers);
        return this.parseResultInternal<T>(response);
    }

    put(uri, data?, headers?): Promise<ApiResponse> {
        return this._invoke("PUT", uri, data, headers);
    }

    async putAs<T>(uri: string, data?, headers?): Promise<ApiResult<T>> {
        const response = await this.put(uri, data, headers);
        return this.parseResultInternal<T>(response);
    }

    delete(uri, data?, headers?): Promise<ApiResponse> {
        return this._invoke("DELETE", uri, data, headers);
    }

    async deleteAs<T>(uri: string, data?, headers?): Promise<ApiResult<T>> {
        const response = await this.delete(uri, data, headers);
        return this.parseResultInternal<T>(response);
    }

    _invoke(
        method: any,
        uri: string,
        data: any,
        headers: any
    ): Promise<ApiResponse> {
        return this._invokeWithRetries(method, uri, data, headers, 1);
    }

    async _invokeWithRetries(
        method: any,
        uri: string,
        data: any,
        headers: any,
        attemptCounter: number
    ): Promise<ApiResponse> {
        try {
            let body = null;

            if (this.options.authClient) {
                const authHeader = await this.options.authClient.getAuthHeader();
                headers = { ...headers, ...authHeader };
            }

            if (data) {
                let processedData = data;
                this.outboundProcessors.forEach(
                    (p) => (processedData = p.processJson(processedData))
                );
                body = processedData;
            }

            const request = {
                method,
                url: uri,
                headers,
                data: body,
            };

            // send request (http errors will still pass our custom validation function)
            const res: AxiosResponse = await this.client.request(request);
            const success = res.status >= 200 && res.status < 300;

            // we're done
            //  - if we're all good (HTTP 2xx)
            //  - if we attempted already the max amount of attempts/retries
            //  - in case of client errors (HTTP 4xx except 401) or redirects (HTTP 3xx)
            if (
                success ||
                attemptCounter >= this.options.maxAttempts ||
                (res.status < 500 && res.status !== 401)
            ) {
                return new ApiResponse(res, undefined, attemptCounter);
            }

            if (
                res.status === 401 &&
                attemptCounter === 1 &&
                this.options.authClient
            ) {
                // in case of an initial 401, refresh the token and retry
                // if this blows up with an exception, the refresh error will be returned as the
                // API result, which should serve well to diagnose things
                await this.options.authClient.refreshToken();
            } else {
                // otherwise delay, then recurse to try again
                const delay = this.calculateRetryDelay(attemptCounter);
                await new Promise((r) => setTimeout(r, delay));
            }
            return await this._invokeWithRetries(
                method,
                uri,
                data,
                headers,
                attemptCounter + 1
            );
        } catch (error) {
            // the request itself failed - include the error
            return new ApiResponse(undefined, error, attemptCounter);
        }
    }

    private calculateRetryDelay(attempts: number) {
        const baseDelay = this.options.retryDelay;

        switch (this.options.retryStrategy) {
            case RetryStrategy.Constant:
                return baseDelay;
            case RetryStrategy.Linear:
                return baseDelay * attempts;
            default:
                return baseDelay * attempts ** 2;
        }
    }

    private async parseResultInternal<T>(
        response: ApiResponse
    ): Promise<ApiResult<T>> {
        return HttpClient.parseResult<T>(response, this.inboundProcessors);
    }

    static async parseResult<T>(
        response: ApiResponse,
        inboundProcessors?: IJsonProcessor[]
    ): Promise<ApiResult<T>> {
        try {
            if (!response.success) {
                // just wrap the original result
                return new ApiResult<T>(
                    undefined,
                    response.response,
                    response.error,
                    response.attempts
                );
            }

            // retrieve JSON data
            let json: any = await response.response.data;

            // process/transform JSON
            if (inboundProcessors) {
                inboundProcessors.forEach((p) => (json = p.processJson(json)));
            }

            // parse JSON and assign result
            const obj: T = json as T;

            return new ApiResult<T>(
                obj,
                response.response,
                undefined,
                response.attempts
            );
        } catch (e) {
            return new ApiResult<T>(
                undefined,
                response.response,
                e,
                response.attempts
            );
        }
    }
}
