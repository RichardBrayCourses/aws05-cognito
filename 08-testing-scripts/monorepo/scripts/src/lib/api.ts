export type ApiCheck = {
  name: string;
  method?: string;
  path: string;
  token?: string;
  expectedStatus: number;
};

export async function apiFetch(
  apiBaseUrl: string,
  path: string,
  options: RequestInit = {},
) {
  return fetch(`${apiBaseUrl}${path}`, options);
}

export async function runApiCheck(apiBaseUrl: string, check: ApiCheck) {
  const headers = new Headers(check.token ? { Authorization: check.token } : {});

  const response = await apiFetch(apiBaseUrl, check.path, {
    method: check.method ?? "GET",
    headers,
  });

  const passed = response.status === check.expectedStatus;

  return {
    ...check,
    actualStatus: response.status,
    passed,
  };
}
