# Axios JWT Refresh Middleware

Minimalist library for automatic JWT token refresh in Axios

## Installation

```bash
npm install axios-jwt-refresh axios js-cookie
# or
yarn add axios-jwt-refresh axios js-cookie
```

## Quick Start

```javascript
import axios from 'axios';
import { createTokenRefreshMiddleware } from 'axios-jwt-refresh';

// 1. Create axios instance
const axiosInstance = axios.create();

// 2. Define token refresh function
const requestNewTokens = async () => {
  const response = await axios.post('/auth/refresh');
  return {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token
  };
};

// 3. Create and attach middleware
axiosInstance.interceptors.request.use(
  createTokenRefreshMiddleware({
    requestTokens: requestNewTokens,
    onRefreshAndAccessExpire: () => {
      // Handle expired session
      window.location.href = '/login';
    },
    accessTokenKey: 'accessToken',
    refreshTokenKey: 'refreshToken',
    cookiesOptions: { secure: true, sameSite: 'strict' }
  })
);

// 4. Use as normal axios instance
axiosInstance.get('/api/protected-data')
  .then(response => console.log(response.data));
```

## Configuration Options

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `requestTokens` | `() => Promise<{accessToken: string, refreshToken: string}>` | Yes | Function to request new tokens |
| `onRefreshAndAccessExpire` | `() => void` | Yes | Callback when both tokens are missing |
| `accessTokenKey` | `string` | Yes | Cookie key for access token |
| `refreshTokenKey` | `string` | Yes | Cookie key for refresh token |
| `timeoutRequest` | `number` | No (30000) | Refresh timeout in ms |
| `cookiesOptions` | `CookieAttributes` | No | Cookie storage options |

## How It Works

1. Checks for access token on each request
2. If access token is missing but refresh token exists:
   - Queues incoming requests
   - Executes token refresh request
   - On success:
     - Stores new tokens
     - Processes queued requests with new token
3. If both tokens are missing:
   - Calls `onRefreshAndAccessExpire` callback
   - Continues original request (will likely get 401)

## Error Handling

### Refresh Token Failure
```javascript
const requestNewTokens = async () => {
  try {
    const response = await axios.post('/auth/refresh');
    return response.data;
  } catch (error) {
    // Custom error handling
    throw error;
  }
};
```

### Request Interceptor
```javascript
axiosInstance.interceptors.response.use(null, (error) => {
  if (error.response?.status === 401) {
    // Handle unauthorized errors
  }
  return Promise.reject(error);
});
```

## Limitations

- Browser environment only (uses js-cookie)
- No built-in retry mechanism for failed refresh attempts
- Minimal configuration approach

## Best Practices

1. Always implement `onRefreshAndAccessExpire` to handle expired sessions
2. Use secure cookie options in production
3. Add error handling to your `requestTokens` function
4. Consider adding request retry logic for failed refresh attempts