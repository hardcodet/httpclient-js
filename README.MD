# Typescript / Javascript API Client

This is an opinionated HTTP client that provides simple access to REST-based APIs. It sits on
top of `axios` (https://github.com/axios/axios) and provides result unwrapping
(with generics support for Typescript), pluggable authentication strategies
and basic retry logic.<br/>
Also supports on-the-fly class transformations (JSON to real classes) and validation
based on `class-transformer` and `class-validator`.

```
public async getUser(): Promise<User> {
    const httpClient = new HttpClient("https://www.foo.com/api");
    const result: ApiResult<User> = await httpClient.getAs<User>("users/123");
    return result.getValueOrThrow();
}
```


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

#### Optional: Class transformations / validation setup

If you are using the built-in class transformations based on `class-transformer`,
you will also need `reflect-metadata`:

```
npm i reflect-metadata
-- or --
yarn add reflect-metadata
```

Then import it in a global place (typically your app initialization):

```
import "reflect-metadata";
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

The package comes with a simple retry mechanism. By default, it will perform up to 2 retries
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


## Transformation and Validation

(Note: if you just need global transformations of date strings to `Date`, read below
on Json Processors and `IsoDateProcessor` specifically.)

Consider this DTO:

```
class User {
    firstName: string;
    lastName: string;
    email: string;
    dateOfBirth: Date;

    getFullName(): string {
        return firstName + " " + lastName;
    }
}
```

Note that if you fetch the JSON that matches this DTO from an API, the
returned object is *not* an instance of `User` but a plain Javascript object.
Accordingly, you don't have a `getFullName` method, and `dateOfBirth` is actually
a string, not a `Date`. The snippet below would fail:

```
// get user
const result: ApiResult<User> = await httpClient.getAs<User>("users/123");  
const user: User = result.value;

// will fail - there is no such method on the returned object!
const fullName: string = user.getFullName();
```


In order to get around this, you can use the transformation feature of the
library. Note the additional `User` type parameter in the `getAs` method:

```
// get user
const result: ApiResult<User> = await httpClient.getAs("users/123", User);  
const user: User = result.value;

// works!
const fullName: string = user.getFullName();
```

#### Type conversions

There is still one gotcha: The javascript runtime still has no idea that the
`dateOfBirth` field should be a Date, since JSON declares dates as regular
strings. In order to transform that string into a `Date` instance,
you will have to decorate your `UserDto.dateOfBirth` field with the
`@Type(() => Date)` decorator:

```
@Type(() => Date)
dateOfBirth: Date;
```

You will also need the `Type` decorator for nested types.
All transformation comes from the `class-transformer` package. For more information,
see https://github.com/typestack/class-transformer.


#### Validation

Transformed types can also be validated based on validation decorators from
the `class-validator` package. For example, in order to make sure the returned
user data contains a valid email address, decorate it like this:

```
@IsEmail()
email: string;
```

For more information on validation, see https://github.com/typestack/class-validator. 


#### Simpler version: JSON Processors

A simpler alternative to decorating every DTO you have is injecting a global JSON
processor. If we review our `User` DTO above, the `getFullName` method may be
an anti-pattern anyway: The DTO should only capture state. This leaves us with
a pretty prototypical use case: We just want all date strings to be parsed into
actual `Date` objects:

```
interface User {
    firstName: string;
    lastName: string;
    email: string;
    dateOfBirth: Date;  // NEEDS TO BE TRANSFORMED
}
```

An alternative here is to use a JSON processor which transforms incoming or
outgoing JSON. And because date transformations are so common, there's the
built-in `IsoDateProcessor` that we can use right away:

```
const c = new HttpClient(options);
c.inboundProcessors.push(new IsoDateProcessor())
```

The injected `IsoDateProcessor` will process retrieved JSON objects
and transform any string that matches an ISO8601 date for us:

```
// get user
const result: ApiResult<User> = await httpClient.getAs("users/123", User);  
const user: User = result.value;

// works, since dateOfBirth is a Date object now
const year: string = user.dateOfBirth.getFullYear();
```

For more flexibility, just check the `IJsonProcessor` interface and the built-in
`StringTransformJsonProcessor` class.


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

