# Lesson 05 - Protect All Endpoints With Cognito

This lesson puts the API behind a Cognito authorizer.

Before this lesson, the UI could sign users in with Cognito, but the API Gateway routes were still public. Anyone who knew the API URL could call `/health`, `/photos`, or `/photos/presigned-url`.

The main changes are:

- API Gateway imports the Cognito User Pool ID from SSM
- API Gateway creates a Cognito authorizer
- all API routes are moved behind an authenticated `/auth/{proxy+}` resource
- the UI sends the stored Cognito ID token in the `Authorization` header
- the UI calls `/auth/...` API paths instead of root API paths
- API Gateway returns CORS-friendly `401` and `403` responses

The `/auth` prefix belongs to API Gateway. Express still handles the inner route path.

## Run

From this folder:

```bash
pnpm install
pnpm run deploy-everything
```

After deployment:

```bash
pnpm run ui:generate-env
pnpm run ui:dev
```

Open the local UI, sign in, and then use the gallery and upload page.

If you want to run the bulk image upload script in this lesson, provide a Cognito ID token first:

```bash
export COGNITO_ID_TOKEN="<id token from a signed-in user>"
pnpm run bulk-image-upload
```

## Expected Behaviour

- Anonymous API calls to `/auth/*` are rejected by API Gateway.
- Signed-in users can call the API from the UI.
- The health check, gallery, upload URL, and delete-photo endpoints all require a Cognito ID token.
- Express does not receive unauthenticated `/auth/*` requests, because API Gateway blocks them first.

## Useful Commands

Deploy only the API:

```bash
pnpm run cdk:deploy:api
```

Deploy only the Cognito stack:

```bash
pnpm run cdk:deploy:cognito
```

Upload the static website:

```bash
pnpm run deploy-website
```

Upload sample images through the protected API:

```bash
export COGNITO_ID_TOKEN="<id token from a signed-in user>"
pnpm run bulk-image-upload
```

Destroy everything:

```bash
pnpm run destroy-everything
```

## Code Changes In This Lesson

This lesson adds the first backend security boundary. The UI login from earlier lessons is now connected to API Gateway authorization.

The API stack reads the Cognito User Pool ID that the Cognito stack wrote to SSM:

```ts
const userPoolId = StringParameter.valueForStringParameter(
  this,
  "/cognito/user-pool-id",
);
```

It imports that User Pool and creates an API Gateway Cognito authorizer:

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

The old root proxy is replaced with an authenticated `/auth` proxy:

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

That means the browser now calls:

```text
GET    /auth/health
GET    /auth/photos
POST   /auth/photos/presigned-url
DELETE /auth/photos
```

But Express still sees:

```text
GET    /health
GET    /photos
POST   /photos/presigned-url
DELETE /photos
```

The `/auth` part is an API Gateway routing boundary. It is not mounted in Express.

The stack also adds gateway responses for authorization failures:

```ts
api.addGatewayResponse("UnauthorizedGatewayResponse", {
  type: ResponseType.UNAUTHORIZED,
  statusCode: "401",
  responseHeaders: {
    "Access-Control-Allow-Origin": "'*'",
    "Access-Control-Allow-Headers": "'Content-Type,Authorization'",
    "Access-Control-Allow-Methods": "'GET,POST,PUT,DELETE,OPTIONS'",
  },
});
```

Without those CORS headers, a browser can turn a useful `401` or `403` into a less helpful CORS error.

On the frontend, API calls now read the Cognito ID token from local storage:

```ts
const idToken = window.localStorage.getItem(ID_TOKEN_STORAGE_KEY);

if (!idToken) {
  throw new Error("You must be logged in to call the API");
}
```

The token is sent as the `Authorization` header:

```ts
return {
  Authorization: idToken,
};
```

The gallery, health check, and upload flow all use `/auth` paths:

```ts
fetch(`${config.apiBaseUrl}/auth/photos`, {
  headers: getAuthHeaders(),
});
```

The shell upload script uses the same idea, but it cannot read the browser's local storage. It expects the token as an environment variable:

```bash
COGNITO_ID_TOKEN="<id token>" pnpm run bulk-image-upload
```

The important teaching point is where the request is stopped:

```text
Browser
  sends Authorization: <id token>

API Gateway /auth/{proxy+}
  validates the token against Cognito

Lambda
  runs only after API Gateway accepts the token

Express
  handles /health, /photos, and /photos/presigned-url
```

At this stage, every API endpoint requires login. The next lesson splits the API into public routes and authenticated routes.
