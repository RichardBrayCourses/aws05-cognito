import { argString, parseArgs } from "./lib/args";
import { ensureTestUser, getIdToken } from "./lib/cognito";
import { getTestUsers, type TestUserRole } from "./lib/testUsers";

async function main() {
  const args = parseArgs();
  const users = getTestUsers();
  const role = (argString(args, "role") ?? argString(args, "user") ?? "admin") as TestUserRole;
  const tokenName = argString(args, "export-name");
  const selectedUser = users[role];

  if (!selectedUser) {
    throw new Error("Use --role user or --role admin.");
  }

  await ensureTestUser(selectedUser);
  const token = await getIdToken(selectedUser);

  if (tokenName) {
    console.log(`export ${tokenName}="${token}"`);
    return;
  }

  console.log(token);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
