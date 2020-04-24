# API Client

This is an opinionated HTTP client that provides simple acces to REST-based APIs. It sits on
top of `axios` and provides result unwrapping (with generics support for Typescript),
pluggable authentication strategies and basic retry logic.

## Installation

<a href="https://www.npmjs.com/package/@hardcodet/httpclient"><img src="https://img.shields.io/npm/v/@hardcodet/httpclient.svg" alt="NPM Version" /></a>
<br>

Using NPM:

```
npm i @hardcodet/httpclient
```

Using Yarn:

```
yarn add @hardcodet/httpclient
```


## Basic Usage

Syntax is quite straightforward:

1. Issue an HTTP call
2. Process the `ApiResponse` (for `get`, `post`, ...) or `ApiResult`
   (for `getAs`, `postAs`, ...) and handle the result. The `ApiResult` class provides
   a `value` property that can be used to get and unwrap the parsed JSON response.

```
public async doWork(): Promise<SomeDto> {

    const httpClient = new HttpClient("https://www.foo.com/api");
    
    const uri = "/v1/bar");
    const payload = { ... };
    
    // send a POST with the specified body
    const response: ApiResult<SomeDto> = await httpClient.postAs<SomeDto>(uri, payload);
    
    // unwrap the returned data (throws exception if the request fails)
    const result: SomeDto = response.getValueOrThrow();
    return result;
}
```
        
<br>
Alternatively, you can inspect the response object, e.g.

```
if (!response.success) {
    if(response.notFound) {
        // we got a 404
        return undefined;
    } else {
        // some other error - throw
        throw new Error(resonse.createError());
    }
} else {
    const result: SomeDto = response.value;
    return result;
}
```   
    
If you don't expect a result, you can use `ensureSuccess`, which will
throw an error in case you won't get an `HTTP 2xx`:

```
const response: ApiResponse = await httpClient.post("some/endpoint");
response.ensureSuccess();
```     

## Authentication

`HttpClient` provides strategy-based authentication through the `IAuthClient` interface that
can be simply injected into a `HttpClient` instance:

```
const basicAuth = new BasicAuthClient("myUserName", "myPassword");
const httpClient = new HttpClient("https://www.foo.com/api", {authClient: basicAuth});
const result = await httpClient.get("protected/endpoint");
```

Every time an invoked endpoint returns an `HTTP 401`, the client will try to resolve
a token through an injected auth strategy (if one is available).


There's currently 3 built-in implementations:

- `Basic` auth (user name / password)
- OAuth client credentials grant
- A delegate-based strategy that allows you to inject some custom token fetch logic.
  The resolved token will then be submitted as a `Bearer` token with subsequent requests.


### Delegation based auth

Here's a short sample with delegation. We simply use a second `HttpClient` without
authentication to fetch the token of the main `httpClient`:

```
constructor() {
    const authClient = new DelegateBearerAuthClient(() => this.getAccessToken());
    this.httpClient = new HttpClient("https://api.foo.com", { authClient });
}


/**
 * Invoked by the delegation authentication strategy of the HTTP client in order to
 * get a new access token when needed.
 */
private async getAccessToken(): Promise<string> {
    // use an independent HTTP client - the default one would block because it's
    // waiting on this method to resolve a token
    const tokenClient = new HttpClient("https://www.auth-provider.com");

    const uri = "v1/login?userId=foo&&password=bar";
    const result = await tokenClient.postAs<string>(uri);
    return result.getValueOrThrow();
}
```


### Custom authentication strategies

`IAuthClient` basically just provides a contract to perform a token fetch/refresh, and to
construct an authorization header value that is being added to the request header when submitting
a request. You can easily build your own.

```
export interface IAuthClient {

    /**
     * Asynchronously refreshes the token.
     */
    refreshToken(): Promise<void>;

    /**
     * Updates the header to be sent with an HTTP
     * request in order to provide authentication.
     */
    getAuthHeader(): Promise<object>;
}
```

## Retries

The package comes with a simple retry mechanism. By default, i will perform up to 2 retries
(3 attempts in total) before giving up in case the invoked endpoint returns a `5xx` error.

For `3xx` (redirects) or `4xx` errors, it will fail immediately without retries.) 

### Retry delays

Delays between retries can follow 3 possible patterns:

- Constant delays, e.g. 2 seconds between retries)
- Linearly increasing delays, e.g. 2, 4, 6, 8 seconds between retries)
- Exponentially increasing delays (default), e.g. 1, 4, 9, 16, 25 seconds between retries) 

```
// up to 4 retries with 5 seconds wait time each
const options: HttpClientOptions = {
    maxAttempts: 5,
    retryDelay: 5000,
    retryStrategy: RetryStrategy.Constant,
};
const httpClient = new HttpClient("https://www.foo.com/api", options);
```


## Options

```
const defaultOptions: HttpClientOptions = {
    timeout: 10000,
    maxAttempts: 3,
    retryDelay: 1000,
    retryStrategy: RetryStrategy.Exponential,
    authClient: undefined,
    customHeaders: undefined,
};
```

|Option Value |Description                                                             |Default                  |
|-------------|------------------------------------------------------------------------|-------------------------|
|timeout      |Max time for a request until it fails.                                  |10000 (ms)               |
|maxAttempts  |Maximum attempts until the client gives up. Set to 1 to disable retries.|3                        |
|retryDelay   |Base delay between retries. Actual delay depends on the retry strategy. |1000 (ms)                |
|retryStrategy|Constantly, linearly or exponentially growing delays.                   |RetryStrategy.Exponential|
|authClient   |Pluggable authentication strategy.                                      |-                        |
|customHeaders|Custom headers to be submitted with every request.                      |-                        |

