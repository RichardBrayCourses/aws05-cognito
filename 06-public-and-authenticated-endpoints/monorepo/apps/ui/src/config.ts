// see https://vite.dev/guide/env-and-mode
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN;
const cognitoClientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
const cognitoUserPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;

export const config = {
  apiBaseUrl: apiBaseUrl.endsWith("/") ? apiBaseUrl.slice(0, -1) : apiBaseUrl,
  cognitoDomain,
  cognitoClientId,
  cognitoUserPoolId,
};
