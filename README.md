# Axios JWT Refresh [![npm version](https://img.shields.io/npm/v/axios-jwt-refresh.svg)](https://www.npmjs.com/package/axios-jwt-refresh)

Automatic JWT refresh middleware for Axios with TypeScript support and flexible storage options.

## Features

- 🔄 Automatic token refresh on 401 errors
- 🍪 Cookie/localStorage support via js-cookie
- ⏳ Request queuing during refresh
- 🛠️ Fully configurable with TypeScript types
- 🔄 Retry mechanism with custom delays
- 🚀 Zero dependencies (except peer deps)

## Installation

```bash
npm install axios-jwt-refresh axios js-cookie
# or
yarn add axios-jwt-refresh axios js-cookie
```

## Basic Usage

```javascript
import axios from 'axios';
import { createTokenRefreshMiddleware } from 'axios-jwt-refresh';

// Create axios instance
const axiosInstance = axios.create();

// Add request interceptor for token refresh
axiosInstance.interceptors.request.use(
  createTokenRefreshMiddleware({
    refreshTokenUrl: '/api/auth/refresh',
    accessTokenCookieOptions: { secure: true }
  })
);

// Example API call
axiosInstance.get('/api/protected-data')
  .then(response => console.log(response.data))
  .catch(error => console.error('API Error:', error));
```

## Advanced Configuration

```javascript
axiosInstance.interceptors.request.use(
  createTokenRefreshMiddleware({
    refreshTokenUrl: '/api/auth/refresh',
    accessTokenKey: 'app_access',
    refreshTokenKey: 'app_refresh',
    accessTokenCookieOptions: { 
      secure: true,
      sameSite: 'strict',
      expires: 1 // 1 day
    },
    getAccessToken: (response) => response.data.token,
    onRefreshSuccess: (response) => {
      console.log('Token refreshed:', response.data.token)
    },
    onRefreshError: (error) => {
      console.error('Refresh failed:', error)
      // Redirect to login
    },
    maxRefreshAttempts: 2
  })
)
```

## API Documentation

### `createTokenRefreshMiddleware(options)`

Creates an Axios request interceptor for automatic token refresh.

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `accessTokenKey` | string | `'accessToken'` | Cookie key for access token |
| `refreshTokenKey` | string | `'refreshToken'` | Cookie key for refresh token |
| `refreshTokenUrl` | string | **Required** | URL for token refresh endpoint |
| `accessTokenCookieOptions` | CookieAttributes | `{ path: '/' }` | Cookie options for access token |
| `refreshTokenCookieOptions` | CookieAttributes | `{ path: '/' }` | Cookie options for refresh token |
| `timeoutRequest` | number | `30000` | Timeout for queued requests (ms) |
| `getAccessToken` | function | `(res) => res.data.accessToken` | Extracts access token from response |
| `getRefreshToken` | function | - | Extracts refresh token from response |
| `onRefreshSuccess` | function | - | Callback on successful refresh |
| `onRefreshError` | function | - | Callback on refresh error |
| `onMissingTokens` | function | - | Callback when both tokens are missing |
| `shouldInterceptRequest` | function | `() => true` | Custom request interception logic |
| `transformRefreshRequest` | function | `(config) => config` | Transforms refresh request |
| `transformRetryRequest` | function | Sets Authorization header | Transforms request before retry |
| `maxRefreshAttempts` | number | `1` | Max refresh retry attempts |
| `refreshRetryDelay` | number | `1000` | Delay between retries (ms) |
| `cookieHandler` | CookieTokenHandler | js-cookie | Custom cookie handler |

## Recipes

### Custom Storage

```javascript
const customStorage = {
  get: (key) => localStorage.getItem(key),
  set: (key, value) => localStorage.setItem(key, value),
  remove: (key) => localStorage.removeItem(key)
}

createTokenRefreshMiddleware({
  refreshTokenUrl: '/refresh',
  cookieHandler: customStorage
})
```

### Custom Token Extraction

```javascript
createTokenRefreshMiddleware({
  refreshTokenUrl: '/refresh',
  getAccessToken: (response) => response.data.data.token,
  getRefreshToken: (response) => response.data.data.refreshToken
})
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)