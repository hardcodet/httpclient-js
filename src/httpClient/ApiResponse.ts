import { AxiosResponse } from "axios";

/**
 * Encapsulates an HTTP response object along with some meta data
 * and helper methods.
 */
export class ApiResponse {
    public response: AxiosResponse;
    public error: any;
    public attempts: number;

    /**
     * Gets the status code. Returns -1 in case we didn't
     * even get a response.
     */
    get status(): number {
        return this.response ? this.response.status : -1;
    }

    /**
     * Checks whether the request was handled successfully (HTTP 2xx).
     */
    get success(): boolean {
        // check for 2xx response plus no errors (could happen during JSON access/parsing or transformation/validation)
        const s = this.status;
        return s > 199 && s < 300 && this.error === undefined;
    }

    /**
     * Checks whether the status code (if we have one) indicates
     * the request was bad. Returns false for HTTP 401.
     */
    get is4xx(): boolean {
        const s = this.status;
        return s > 399 && s < 500 && s !== 401;
    }

    /**
     * True if the response is an HTTP 403.
     */
    get forbidden(): boolean {
        return this.response && this.response.status === 403;
    }

    /**
     * True if the response is an HTTP 404.
     */
    get notFound(): boolean {
        return this.response && this.response.status === 404;
    }

    constructor(res: AxiosResponse, error: any, attempts: number) {
        this.response = res;
        this.error = error;
        this.attempts = attempts;
    }

    /**
     * Constructs an error message from the response (if available) or
     * an exception.
     */
    public getErrorMessage() {
        if (this.error) {
            return `Failed HTTP request: ${this.error} \n ${this.error.stack}`;
        }

        const res = this.response;
        const statusText = res.statusText ? res.statusText : "n/a";

        let data = "";
        try {
            if (res.data) {
                data = " - " + JSON.stringify(res.data);
            }
        } catch (e) {
            // we can't parse the response - give up
            console.error(e);
        }

        return `${statusText} (${this.status})${data}`;
    }

    /**
     * Validates the response was successful. If not,
     * throws an exception.
     */
    public ensureSuccess() {
        if (this.success) {
            return;
        }

        throw this.createError();
    }

    /**
     * Convenience method to create (not yet throw!) an error if success has been manually validated.
     */
    public createError(): Error {
        if (this.error) {
            return this.error;
        } else {
            // throw a generic error rather than an HttpException that will
            // hit right through to the user
            return new Error(this.getErrorMessage());
        }
    }
}
