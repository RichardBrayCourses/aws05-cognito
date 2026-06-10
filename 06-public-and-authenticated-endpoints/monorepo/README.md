# Lesson 06 - Public And Authenticated Endpoints

This lesson changes the API from "everything requires login" to a more useful split:

```text
/public/{proxy+}
  Anonymous access allowed

/auth/{proxy+}
  Cognito authentication required
```

The main changes are:

- API Gateway has a public proxy with no authorizer
- API Gateway has an authenticated proxy with the Cognito authorizer
- public gallery and health routes are available without login
- photo uploads still require a signed-in Cognito user
- Express route files separate public routes from authenticated routes
- the UI calls public endpoints without a token and upload endpoints with a token

As in the previous lesson, `/public` and `/auth` are API Gateway path prefixes. Express receives the route inside the selected zone.

## Run

From this folder:

```bash
pnpm install
pnpm run deploy-everything
```

After deployment:

```bash
pnpm run api:bulk-image-upload
pnpm run ui:url
```

The gallery should load for anonymous visitors. Uploading still requires sign-in.

The bulk upload script calls the protected upload endpoint, so it needs a Cognito ID token:

```bash
export COGNITO_ID_TOKEN="<id token from a signed-in user>"
pnpm run api:bulk-image-upload
```

## Expected Behaviour

- Anonymous users can call `GET /public/health`.
- Anonymous users can call `GET /public/gallery-photos`.
- Anonymous users cannot call `POST /auth/photos/presigned-url`.
- Signed-in users can request a presigned upload URL and upload a photo.
- Express still receives `/health`, `/gallery-photos`, and `/photos/presigned-url`, not the external `/public` or `/auth` prefixes.

## Useful Commands

Deploy only the API:

```bash
pnpm run cdk:deploy:api
```

Upload sample images through the API:

```bash
export COGNITO_ID_TOKEN="<id token from a signed-in user>"
pnpm run api:bulk-image-upload
```

Print the deployed UI URL:

```bash
pnpm run ui:url
```

Destroy everything:

```bash
pnpm run destroy-everything
```

## Code Changes In This Lesson

Lesson 05 protected the whole API. This lesson keeps Cognito protection for user actions, but makes read-only public data available without login.

The API stack creates one Lambda integration:

```ts
const apiIntegration = new LambdaIntegration(apiFunction, {
  proxy: true,
});
```

Then it mounts that same Lambda behind two API Gateway zones.

The public zone has no authorizer:

```ts
const publicResource = api.root.addResource("public");
publicResource.addProxy({
  anyMethod: true,
  defaultIntegration: apiIntegration,
  defaultMethodOptions: {
    authorizationType: AuthorizationType.NONE,
  },
});
```

The authenticated zone uses the Cognito authorizer:

```ts
const authResource = api.root.addResource("auth");
authResource.addProxy({
  anyMethod: true,
  defaultIntegration: apiIntegration,
  defaultMethodOptions: {
    authorizationType: AuthorizationType.COGNITO,
    authorizer,
  },
});
```

That creates this deployed API shape:

```text
GET  /public/health
GET  /public/gallery-photos
POST /auth/photos/presigned-url
```

Inside Express, the routes are organised around the same idea. Public routes are mounted before the authentication middleware:

```ts
app.use(publicRoutes);
app.use(attachAuth, requireAuth);
app.use("/photos", photoRoutes);
```

The public router owns the anonymous endpoints:

```ts
publicRoutes.get("/health", getHealth);
publicRoutes.get("/gallery-photos", getPhotos);
```

The authenticated photo router owns the upload URL endpoint:

```ts
photoRoutes.post("/presigned-url", getPresignedUrl);
```

The order matters:

```text
publicRoutes
  runs first, so health and gallery do not require req.auth

attachAuth, requireAuth
  runs before photoRoutes, so upload requires a signed-in user
```

`attachAuth` reads Cognito claims from the API Gateway authorizer data in the Lambda event. `requireAuth` checks that a user exists before allowing the protected route to continue.

The frontend follows the same split.

Health and gallery calls do not send a token:

```ts
fetch(`${config.apiBaseUrl}/public/gallery-photos`);
```

The upload URL call still reads the ID token and sends it to the protected zone:

```ts
const response = await fetch(
  `${config.apiBaseUrl}/auth/photos/presigned-url`,
  {
    method: "POST",
    headers: {
      Authorization: idToken,
    },
  },
);
```

The shell upload script follows the same protection model. It uploads images through `/auth/photos/presigned-url`, so it expects `COGNITO_ID_TOKEN` to be set before it runs.

This lesson teaches the difference between public read endpoints and authenticated user actions:

```text
Public data:
  no token required

User action:
  valid Cognito token required
```

The next lesson keeps this public/authenticated split and adds administrator-only authorization with Cognito group claims.
