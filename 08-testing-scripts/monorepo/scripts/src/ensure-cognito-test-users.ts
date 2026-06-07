import { ensureTestUsers } from "./lib/cognito";

async function main() {
  const users = await ensureTestUsers();

  console.log("Cognito test users are ready:");
  console.log(`regular: ${users.user.email}`);
  console.log(`admin:   ${users.admin.email}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
