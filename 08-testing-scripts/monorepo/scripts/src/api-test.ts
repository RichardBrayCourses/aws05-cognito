import { ensureTestUsers, getIdToken } from "./lib/cognito";
import { runApiCheck, type ApiCheck } from "./lib/api";
import { getApiBaseUrl } from "./lib/ssm";

async function main() {
  const apiBaseUrl = await getApiBaseUrl();
  const users = await ensureTestUsers();
  const [userToken, adminToken] = await Promise.all([
    getIdToken(users.user),
    getIdToken(users.admin),
  ]);

  const checks: ApiCheck[] = [
    {
      name: "public health allows anonymous access",
      path: "/public/health",
      expectedStatus: 200,
    },
    {
      name: "public gallery allows anonymous access",
      path: "/public/gallery-photos",
      expectedStatus: 200,
    },
    {
      name: "photo upload URL rejects anonymous access",
      method: "POST",
      path: "/auth/photos/presigned-url",
      expectedStatus: 401,
    },
    {
      name: "photo upload URL allows regular user",
      method: "POST",
      path: "/auth/photos/presigned-url",
      token: userToken,
      expectedStatus: 200,
    },
    {
      name: "admin member rejects anonymous access",
      path: "/auth/admin/member",
      expectedStatus: 401,
    },
    {
      name: "admin member rejects regular user",
      path: "/auth/admin/member",
      token: userToken,
      expectedStatus: 403,
    },
    {
      name: "admin member allows administrator",
      path: "/auth/admin/member",
      token: adminToken,
      expectedStatus: 200,
    },
    {
      name: "admin delete rejects regular user",
      method: "DELETE",
      path: "/auth/admin/photos",
      token: userToken,
      expectedStatus: 403,
    },
  ];

  console.log(`Testing API security at ${apiBaseUrl}`);
  console.log("");

  const results = [];
  for (const check of checks) {
    const result = await runApiCheck(apiBaseUrl, check);
    results.push(result);

    const status = result.passed ? "PASS" : "FAIL";
    console.log(
      `${status} ${result.name} (expected ${result.expectedStatus}, got ${result.actualStatus})`,
    );
  }

  const failures = results.filter((result) => !result.passed);
  if (failures.length > 0) {
    console.log("");
    throw new Error(`${failures.length} API security check(s) failed.`);
  }

  console.log("");
  console.log("All API security checks passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
