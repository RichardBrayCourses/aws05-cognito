import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminInitiateAuthCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { getCognitoConfig } from "./ssm";
import { getTestUsers, type TestUserConfig, type TestUserRole } from "./testUsers";

const cognitoClient = new CognitoIdentityProviderClient({});

function isAwsError(error: unknown, name: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === name
  );
}

export async function ensureTestUser(user: TestUserConfig) {
  const { userPoolId } = await getCognitoConfig();

  try {
    await cognitoClient.send(
      new AdminGetUserCommand({
        UserPoolId: userPoolId,
        Username: user.email,
      }),
    );
  } catch (error) {
    if (!isAwsError(error, "UserNotFoundException")) {
      throw error;
    }

    await cognitoClient.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: user.email,
        MessageAction: "SUPPRESS",
        UserAttributes: [
          { Name: "email", Value: user.email },
          { Name: "email_verified", Value: "true" },
        ],
      }),
    );
  }

  await cognitoClient.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: user.email,
      Password: user.password,
      Permanent: true,
    }),
  );

  if (user.groupName) {
    await cognitoClient.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: userPoolId,
        Username: user.email,
        GroupName: user.groupName,
      }),
    );
  }
}

export async function ensureTestUsers() {
  const users = getTestUsers();
  await ensureTestUser(users.user);
  await ensureTestUser(users.admin);
  return users;
}

export async function getIdToken(user: TestUserConfig) {
  const { clientId, userPoolId } = await getCognitoConfig();

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

  const idToken = response.AuthenticationResult?.IdToken;
  if (!idToken) {
    throw new Error(`Could not get an ID token for ${user.email}.`);
  }

  return idToken;
}

export async function getTestUserToken(role: TestUserRole) {
  const users = getTestUsers();
  const user = users[role];
  await ensureTestUser(user);
  return getIdToken(user);
}
