# Authorizer Lesson 06: Admin Claims

This lesson adds authorization based on Cognito group membership.

The previous lesson split the API into:

```text
/public/{proxy+}
  No login required

/auth/{proxy+}
  Cognito login required
```

This lesson keeps that same API Gateway structure, then adds a second authorization decision inside Express:

```text
Is this signed-in user a member of the administrators group?
```

## Cognito Group

The Cognito stack creates an `administrators` group:

```ts
new CfnUserPoolGroup(this, "AdministratorsGroup", {
  userPoolId: userPool.userPoolId,
  groupName: "administrators",
  description: "Administrator users",
});
```

API Gateway does not check this group. API Gateway only validates that the token is a valid Cognito token for the configured User Pool.

The group appears in the user's token claims as:

```text
cognito:groups
```

Express uses that claim for application-level authorization.

## API Gateway

The API still has two zones:

```text
/public/*
  No token required

/auth/*
  Valid Cognito token required
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

For any `/auth/*` request, API Gateway validates the token first. If the token is invalid, Lambda does not run. If the token is valid, the request reaches Express with the Cognito claims available in the Lambda event.

## Express Claims Middleware

The middleware reads claims from the current Lambda invoke:

```ts
const invoke = getCurrentInvoke?.();
const claims = invoke?.event?.requestContext?.authorizer?.claims;
```

It stores the current user on the Express request:

```ts
(req as any).auth = {
  sub: claims.sub,
  email: claims.email,
  groups: parseGroups(claims["cognito:groups"]),
};
```

`requireAuth` checks that a signed-in user exists:

```ts
if (!auth?.sub) {
  res.status(401).json({ error: "Authentication required" });
  return;
}
```

`requireGroup` checks group membership:

```ts
if (!auth?.groups.includes(groupName)) {
  res.status(403).json({ error: "Insufficient permissions" });
  return;
}
```

## Route Structure

The Express app uses three groups of routes:

```ts
app.use(publicRoutes);
app.use(attachAuth, requireAuth);
app.use("/photos", photoRoutes);
app.use(
  "/admin",
  requireGroup("administrators"),
  administratorRoutes,
);
```

That means:

```text
GET /public/health
GET /public/gallery-photos
```

are public, while:

```text
POST /auth/photos/presigned-url
```

requires any signed-in user, and:

```text
GET    /auth/admin/member
DELETE /auth/admin/photos
```

requires a signed-in user who belongs to the `administrators` group.

## UI

The UI checks administrator membership by calling:

```text
GET /auth/admin/member
```

If the request succeeds, the user is an administrator. If it fails with `403`, the user is signed in but not in the required group.

## What This Lesson Teaches

This lesson shows the difference between authentication and authorization:

```text
Authentication:
  API Gateway checks that the token is valid.

Authorization:
  Express checks the claims to decide what the user can do.
```

It also shows why claims matter. Cognito group membership is not just a UI concept; it is encoded into the token and can be used by the backend.
