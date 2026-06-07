# Authorizer Lesson 04: Protect All Endpoints

This lesson adds API Gateway authentication in front of the API server.

The UI already lets a user sign in with Cognito. Until this lesson, the API itself is still public: API Gateway forwards every request to the Lambda function and Express handles paths such as `/health`, `/photos`, and `/photos/presigned-url`.

In this lesson, every API endpoint is moved behind an API Gateway path prefix:

```text
/auth/{proxy+}
```

That `/auth` prefix is important because it is an API Gateway routing boundary, not an Express route. The browser calls:

```text
GET  /auth/health
GET  /auth/photos
POST /auth/photos/presigned-url
```

But Express still sees:

```text
GET  /health
GET  /photos
POST /photos/presigned-url
```

API Gateway strips the matched `/auth` resource path before the Lambda proxy event is handled by `serverless-express`.

## API Gateway

The API stack imports the Cognito User Pool ID from SSM:

```ts
const userPoolId = StringParameter.valueForStringParameter(
  this,
  "/cognito/user-pool-id",
);
```

It then creates a Cognito authorizer:

```ts
const userPool = UserPool.fromUserPoolId(this, "ImportedUserPool", userPoolId);

const authorizer = new CognitoUserPoolsAuthorizer(
  this,
  "CognitoAuthorizer",
  {
    cognitoUserPools: [userPool],
    identitySource: "method.request.header.Authorization",
  },
);
```

The old catch-all root proxy is replaced with an authenticated `/auth` proxy:

```ts
const authResource = api.root.addResource("auth");
authResource.addProxy({
  anyMethod: true,
  defaultIntegration: integration,
  defaultMethodOptions: {
    authorizationType: AuthorizationType.COGNITO,
    authorizer,
  },
});
```

Now API Gateway checks the `Authorization` header before Lambda runs. If the request has no valid Cognito token, API Gateway returns `401` or `403` and Express is never called.

The stack also adds CORS headers to API Gateway's unauthorized and forbidden responses, so the browser can read those failures cleanly.

## UI

The UI reads the stored Cognito ID token and sends it as the `Authorization` header:

```ts
const idToken = window.localStorage.getItem(ID_TOKEN_STORAGE_KEY);
```

API calls now use the `/auth` prefix:

```text
/auth/health
/auth/photos
/auth/photos/presigned-url
```

So the request flow is:

```text
Browser
  sends Authorization: <id token>

API Gateway /auth/{proxy+}
  validates the token against Cognito

Lambda
  receives only the inner Express path

Express
  handles /health, /photos, /photos/presigned-url
```

## What This Lesson Teaches

This lesson shows the first security boundary:

```text
All API requests require a signed-in Cognito user.
```

It also shows that the external API Gateway path and the internal Express path are not always the same path. `/auth` is visible to the browser, but not to the Express route handlers.
