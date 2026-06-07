# Authorizer Lesson 05: Public And Authenticated Endpoints

This lesson changes the API from "everything requires login" to a more realistic split:

```text
/public/{proxy+}
  Anonymous access allowed

/auth/{proxy+}
  Cognito login required
```

The key idea is that API Gateway owns the broad authentication boundary. Express only receives requests after API Gateway has decided whether that root path is public or protected.

## External API Paths

The browser calls these public endpoints without a token:

```text
GET /public/health
GET /public/gallery-photos
```

The browser calls this authenticated endpoint with a Cognito ID token:

```text
POST /auth/photos/presigned-url
```

As in the previous lesson, `/public` and `/auth` are API Gateway resource prefixes. They are not Express route prefixes.

Express receives:

```text
GET  /health
GET  /gallery-photos
POST /photos/presigned-url
```

## API Gateway

The API stack creates one Lambda integration and two root-level API Gateway zones.

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

That creates this rule:

```text
/public/*
  No token required

/auth/*
  Valid Cognito token required
```

If `/auth/*` is called without a valid token, API Gateway rejects the request before Lambda runs.

## Express

The Express app now separates public routes from authenticated routes:

```ts
app.use(publicRoutes);
app.use(attachAuth, requireAuth);
app.use("/photos", photoRoutes);
```

Public routes are mounted before the authentication middleware:

```text
GET /health
GET /gallery-photos
```

Authenticated routes are mounted after `attachAuth` and `requireAuth`:

```text
POST /photos/presigned-url
```

`attachAuth` reads the claims that API Gateway placed into the Lambda event. `requireAuth` checks that an authenticated user exists before allowing the route to continue.

## UI

The gallery and health check use public API paths:

```text
/public/health
/public/gallery-photos
```

Photo upload uses the protected API path and sends the Cognito ID token:

```text
/auth/photos/presigned-url
```

## What This Lesson Teaches

This lesson shows two different API security zones:

```text
Public data can remain public.
User actions can require login.
```

It also reinforces that `/public` and `/auth` are API Gateway routing prefixes. Express sees the route inside the selected zone, not the zone prefix itself.
