# API Client

This is a simple HTTP client that provides simple, pluggable auth,
result unwrapping and basic retry logic for node projects with generics support
for Typescript projects.

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
   a `value` property that can be used to get the parsed JSON response. 

```
const httpClient = new HttpClient("https://www.foo.com/api");

const uri = "/v1/bar");
const payload = { ... };

const result: ApiResult<SomeDto> = await httpClient.postAs<SomeDto>(uri, payload);
if (!result.success) {
    if(result.notFound) {
        // we got a 404
    } else {
        // some other error
    }
} else {
    const value: SomeDto = result.value;
}
```
        
        
Alternatively, just use the `getValueOrThrow` method to unwrap a result, or throw
an exception if the call wasn't successful:
        
```
// this would throw an exception if the result wasn't successful
const result: ApiResult<SomeDto> = await httpClient.postAs<SomeDto>(uri, payload);
const value: SomeDto = result.getValueOrThrow();
```   
    
If you don't expect a result, you can use `ensureSuccess`, which will
also throw an error in case you won't get an `HTTP 2xx`:

```
const response: ApiResponse = await httpClient.post("some/endpoint");
response.ensureSuccess();
```     

## Authentication

The client provides strategy-based authentication through the `IAuthClient` interface that
can be simply injected into a `HttpClient` instance:

```
const basicAuth = new BasicAuthClient("myUserName", "myPassword");
const httpClient = new HttpClient("https://www.foo.com/api", {authClient: basicAuth});
const result = await httpClient.get("protected/endpoint");
```

`IAuthClient` basically just provides a contract to perform a token fetch/refresh, and to
construct an authorization header value that is being added to the request header when submitting
a request. There's multiple implementations for this out of the box (basic auth, OAuth client
credentials grant and a delegate-based one), or you can build your own.

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
(3 attempts in total) before giving up.

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
    retryStrategy: RetryStrategy.Linear,
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

