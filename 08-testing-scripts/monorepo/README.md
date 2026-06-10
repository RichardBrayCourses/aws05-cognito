# Lesson 08 - Testing Scripts

This lesson keeps the completed Cognito authorizer implementation and adds command-line scripts that test the deployed API.

The application security model is:

```text
/public/{proxy+}
  Anonymous access allowed

/auth/{proxy+}
  Cognito authentication required

/auth/admin/*
  Cognito authentication plus administrators group membership required
```

The main changes are:

- TypeScript scripts are added under `scripts/src`
- test users are created or updated in Cognito
- the admin test user is added to the `administrators` group
- scripts read deployed API and Cognito configuration from SSM
- tests obtain Cognito ID tokens from the command line
- `api:test` checks the deployed public, authenticated, and admin routes
- `api:bulk-image-upload` uploads sample images through the protected API

These are integration checks against deployed AWS resources. They are not isolated Express unit tests.

## Run

From this folder:

```bash
pnpm install
pnpm run deploy-everything
```

Create or update the Cognito test users:

```bash
pnpm run cognito:test-users
```

Run the API security checks:

```bash
pnpm run api:test
```

Upload sample images through the deployed API:

```bash
pnpm run api:bulk-image-upload
```

Print the deployed UI URL:

```bash
pnpm run ui:url
```

## Expected Behaviour

- `api:test` creates or updates a regular test user and an admin test user.
- Public endpoints return `200` without a token.
- Authenticated endpoints reject anonymous requests.
- Authenticated endpoints allow a regular signed-in user.
- Admin endpoints reject regular signed-in users with `403`.
- Admin endpoints allow the admin test user.
- `api:bulk-image-upload` deletes existing photos as admin, uploads local sample photos, then reads the public gallery count.

## Useful Commands

Get a Cognito token for a test user:

```bash
pnpm run cognito:get-token
```

Deploy only the API:

```bash
pnpm run cdk:deploy:api
```

Deploy only Cognito after auth-flow changes:

```bash
pnpm run cdk:deploy:cognito
```

Destroy everything:

```bash
pnpm run destroy-everything
```

## Code Changes In This Lesson

The previous lessons built the security model. This lesson adds scripts that prove the deployed model works.

The root package adds TypeScript command-line scripts:

```json
"api:test": "tsx scripts/src/api-test.ts",
"api:bulk-image-upload": "tsx scripts/src/api-bulk-image-upload.ts",
"cognito:get-token": "tsx scripts/src/cognito-get-token.ts",
"cognito:test-users": "tsx scripts/src/ensure-cognito-test-users.ts"
```

The scripts discover deployed resources from SSM:

```text
/services/api/base-url
/cognito/client-id
/cognito/user-pool-id
```

The browser still signs in through the hosted UI authorization-code flow. The scripts need to sign in from the shell, so the Cognito app client enables password-based test automation flows:

```ts
authFlows: {
  adminUserPassword: true,
  userSrp: true,
},
```

The test-user helper manages two users:

```text
test-user@example.com
test-admin@example.com
```

The regular user is not placed in the `administrators` group. The admin user is placed in that group:

```ts
if (user.groupName) {
  await cognitoClient.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: user.email,
      GroupName: user.groupName,
    }),
  );
}
```

The helper also sets a permanent password so the scripts can request tokens repeatedly:

```ts
await cognitoClient.send(
  new AdminSetUserPasswordCommand({
    UserPoolId: userPoolId,
    Username: user.email,
    Password: user.password,
    Permanent: true,
  }),
);
```

The token helper uses Cognito's admin password auth flow:

```ts
const response = await cognitoClient.send(
  new AdminInitiateAuthCommand({
    UserPoolId: userPoolId,
    ClientId: clientId,
    AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
    AuthParameters: {
      USERNAME: user.email,
      PASSWORD: user.password,
    },
  }),
);
```

`pnpm run api:test` gets one token for the regular user and one token for the admin user:

```ts
const [userToken, adminToken] = await Promise.all([
  getIdToken(users.user),
  getIdToken(users.admin),
]);
```

It then checks the deployed API:

```text
GET /public/health
  anonymous access succeeds

GET /public/gallery-photos
  anonymous access succeeds

POST /auth/photos/presigned-url
  anonymous access fails
  regular user access succeeds

GET /auth/admin/member
  anonymous access fails
  regular user access fails
  admin user access succeeds

DELETE /auth/admin/photos
  regular user access fails
```

Each check is run against the real API Gateway URL:

```ts
const result = await runApiCheck(apiBaseUrl, check);
```

This matters because the test covers the whole deployed chain:

```text
SSM parameter lookup
Cognito user setup
Cognito token creation
API Gateway route matching
Cognito authorizer
Lambda adapter
Express middleware and routes
```

The bulk image upload script uses the same auth helpers. By default it gets an admin token:

```ts
const token = process.env.COGNITO_ID_TOKEN ?? await getTestUserToken("admin");
```

Then it deletes existing photos through the admin route:

```ts
await apiFetch(apiBaseUrl, "/auth/admin/photos", {
  method: "DELETE",
  headers: {
    Authorization: token,
  },
});
```

For each local file in `photos-to-upload`, it asks the protected upload endpoint for a presigned URL:

```ts
const uploadUrlResponse = await apiFetch(
  apiBaseUrl,
  "/auth/photos/presigned-url",
  {
    method: "POST",
    headers: {
      Authorization: token,
    },
  },
);
```

Then it uploads the image directly to S3 with `PUT`:

```ts
await fetch(uploadUrl, {
  method: "PUT",
  headers: {
    "Content-Type": contentTypeFor(photoName),
  },
  body: await readFile(photoPath),
});
```

Finally, it reads the public gallery endpoint to count the uploaded images:

```ts
const photosResponse = await apiFetch(apiBaseUrl, "/public/gallery-photos");
```

The teaching point in this lesson is that authentication code needs deployed integration checks. A local route test can prove Express logic, but it cannot prove that API Gateway, Cognito, group claims, Lambda, and the browser-facing paths are wired together correctly.
