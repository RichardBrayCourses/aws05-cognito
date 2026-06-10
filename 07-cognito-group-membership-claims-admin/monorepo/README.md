# Lesson 07 - Cognito Group Membership Claims Admin

This lesson adds administrator-only routes using Cognito group membership claims.

The API still has the same two API Gateway zones:

```text
/public/{proxy+}
  Anonymous access allowed

/auth/{proxy+}
  Cognito authentication required
```

This lesson adds a second decision inside Express:

```text
Is this signed-in user in the administrators group?
```

The main changes are:

- the Cognito stack creates an `administrators` group
- the auth middleware reads the `cognito:groups` claim
- Express gets a reusable `requireGroup(...)` middleware
- admin routes are mounted under `/admin`
- deleting all photos moves behind an administrator-only route
- the UI checks admin membership with `GET /auth/admin/member`

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

To see administrator-only UI behaviour, add a signed-in Cognito user to the `administrators` group in the AWS Console, then sign out and sign in again so the ID token contains the updated group claim.

The bulk upload script deletes existing photos through an admin endpoint before uploading, so it needs an administrator ID token:

```bash
export COGNITO_ID_TOKEN="<id token from an administrator user>"
pnpm run api:bulk-image-upload
```

## Expected Behaviour

- Anonymous users can read public health and gallery endpoints.
- Any signed-in Cognito user can request a photo upload URL.
- Only signed-in users in the `administrators` group can call admin endpoints.
- A signed-in non-admin receives `403` from admin routes.
- The UI can use `GET /auth/admin/member` as a simple admin-membership check.

## Useful Commands

Deploy only the Cognito stack:

```bash
pnpm run cdk:deploy:cognito
```

Deploy only the API:

```bash
pnpm run cdk:deploy:api
```

Upload sample images through the API:

```bash
export COGNITO_ID_TOKEN="<id token from an administrator user>"
pnpm run api:bulk-image-upload
```

Destroy everything:

```bash
pnpm run destroy-everything
```

## Code Changes In This Lesson

Lesson 06 answered "is this user signed in?" This lesson answers "what is this signed-in user allowed to do?"

The Cognito stack creates a group named `administrators`:

```ts
new CfnUserPoolGroup(this, "AdministratorsGroup", {
  userPoolId: userPool.userPoolId,
  groupName: "administrators",
  description: "Administrator users",
});
```

API Gateway does not enforce that group. API Gateway only checks that `/auth/*` requests have a valid Cognito token.

When the request reaches Lambda, API Gateway includes the token claims in the event. The Express middleware reads those claims:

```ts
const invoke = getCurrentInvoke?.();
const claims: Claims | undefined =
  invoke?.event?.requestContext?.authorizer?.claims;
```

The middleware stores the current user on the Express request:

```ts
(req as any).auth = {
  sub: claims.sub,
  email: claims.email,
  groups: parseGroups(claims["cognito:groups"]),
} as AuthUser;
```

The `cognito:groups` claim can arrive as a string or an array, so the middleware normalises it:

```ts
function parseGroups(raw: Claims["cognito:groups"]): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;

  return raw
    .split(",")
    .map((group) => group.trim())
    .filter(Boolean);
}
```

The existing `requireAuth` middleware still checks that there is a signed-in user:

```ts
if (!auth?.sub) {
  res.status(401).json({ error: "Authentication required" });
  return;
}
```

This lesson adds `requireGroup`, which checks authorization:

```ts
export function requireGroup(groupName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = (req as any).auth as AuthUser | undefined;

    if (!auth?.groups.includes(groupName)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    next();
  };
}
```

The Express app mounts routes in three layers:

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

That gives the API this protection model:

```text
GET    /public/health
GET    /public/gallery-photos
  public

POST   /auth/photos/presigned-url
  any signed-in Cognito user

GET    /auth/admin/member
DELETE /auth/admin/photos
  signed-in Cognito user in the administrators group
```

The admin router is deliberately small:

```ts
administratorRoutes.get("/member", getAdministratorMember);
administratorRoutes.delete("/photos", deletePhotos);
```

`GET /auth/admin/member` is useful for the UI. If it returns `200`, the current user is an administrator:

```ts
export function getAdministratorMember(_req: Request, res: Response) {
  res.json({
    ok: true,
    message: "administrator",
  });
}
```

On the frontend, the admin check sends the ID token to the protected admin endpoint:

```ts
const response = await fetch(
  `${config.apiBaseUrl}/auth/admin/member`,
  {
    headers: {
      Authorization: idToken,
    },
  },
);

return response.ok;
```

The lesson's shell upload script uses the same admin route. It first calls `DELETE /auth/admin/photos`, then uploads through `POST /auth/photos/presigned-url`, so the token in `COGNITO_ID_TOKEN` must belong to a user in the `administrators` group.

The important teaching point is the difference between authentication and authorization:

```text
Authentication:
  API Gateway checks that the Cognito token is valid.

Authorization:
  Express checks the Cognito claims to decide what the user can do.
```

The next lesson adds scripts that test these public, authenticated, and administrator-only behaviours after deployment.
