export type TestUserRole = "user" | "admin";

export type TestUserConfig = {
  role: TestUserRole;
  email: string;
  password: string;
  groupName?: string;
};

export const ADMIN_GROUP_NAME = "administrators";

export function getTestUsers(): Record<TestUserRole, TestUserConfig> {
  return {
    user: {
      role: "user",
      email: process.env.COGNITO_TEST_USER_EMAIL ?? "test-user@example.com",
      password: process.env.COGNITO_TEST_USER_PASSWORD ?? "TestUserPassword123!",
    },
    admin: {
      role: "admin",
      email: process.env.COGNITO_TEST_ADMIN_EMAIL ?? "test-admin@example.com",
      password: process.env.COGNITO_TEST_ADMIN_PASSWORD ?? "TestAdminPassword123!",
      groupName: ADMIN_GROUP_NAME,
    },
  };
}
