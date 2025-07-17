import { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { CookieAttributes } from 'js-cookie'

/**
 * Interface for handling token storage operations using cookies
 * @interface
 */
export interface CookieTokenHandler {
  /**
   * Retrieves a token from cookies
   * @param {string} key - The cookie key to retrieve
   * @returns {string | undefined} The token value or undefined if not found
   */
  get: (key: string) => string | undefined

  /**
   * Stores a token in cookies
   * @param {string} key - The cookie key to store under
   * @param {string} value - The token value to store
   * @param {CookieAttributes} [options] - Optional cookie attributes
   */
  set: (key: string, value: string, options?: CookieAttributes) => void

  /**
   * Removes a token from cookies
   * @param {string} key - The cookie key to remove
   * @param {CookieAttributes} [options] - Optional cookie attributes (must match those used when setting)
   */
  remove: (key: string, options?: CookieAttributes) => void
}

/**
 * Configuration options for token refresh middleware
 * @interface
 * @template T - Type of the response data from refresh endpoint
 */
export interface TokenRefreshOptions<T = any> {
  /**
   * Cookie key for access token (default: 'accessToken')
   */
  accessTokenKey?: string

  /**
   * Cookie key for refresh token (default: 'refreshToken')
   */
  refreshTokenKey?: string

  /**
   * URL endpoint for refreshing tokens
   */
  refreshTokenUrl: string

  /**
   * Cookie attributes for access token
   * @default { path: '/' }
   */
  accessTokenCookieOptions?: CookieAttributes

  /**
   * Cookie attributes for refresh token
   * @default { path: '/' }
   */
  refreshTokenCookieOptions?: CookieAttributes

  /**
   * Timeout for queued requests during refresh (ms)
   * @default 30000
   */
  timeoutRequest?: number

  /**
   * Function to extract access token from refresh response
   * @default (response) => response.data.accessToken
   */
  getAccessToken?: (response: AxiosResponse<T>) => string

  /**
   * Function to extract refresh token from refresh response
   */
  getRefreshToken?: (response: AxiosResponse<T>) => string

  /**
   * Callback when token refresh succeeds
   * @param {AxiosResponse<T>} response - The refresh response
   * @param {string} newAccessToken - The new access token
   */
  onRefreshSuccess?: (response: AxiosResponse<T>, newAccessToken: string) => void

  /**
   * Callback when token refresh fails
   * @param {AxiosError} error - The error that occurred
   */
  onRefreshError?: (error: AxiosError) => void

  /**
   * Callback when both tokens are missing
   */
  onMissingTokens?: () => void

  /**
   * Custom function to determine if request should be intercepted
   * @default () => true
   */
  shouldInterceptRequest?: (config: InternalAxiosRequestConfig) => boolean

  /**
   * Transform refresh request before sending
   * @default (config) => config
   */
  transformRefreshRequest?: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig

  /**
   * Transform original request before retry after refresh
   * @default (config, token) => { 
   *   config.headers.set('Authorization', `Bearer ${token}`);
   *   return config 
   * }
   */
  transformRetryRequest?: (
    config: InternalAxiosRequestConfig, 
    newAccessToken: string
  ) => InternalAxiosRequestConfig

  /**
   * Maximum number of refresh attempts
   * @default 1
   */
  maxRefreshAttempts?: number

  /**
   * Delay between refresh attempts (ms)
   * @default 1000
   */
  refreshRetryDelay?: number

  /**
   * Custom cookie handler implementation
   * @default Built-in js-cookie handler
   */
  cookieHandler?: CookieTokenHandler
}

/**
 * Interface for queued requests during token refresh
 * @interface
 */
export interface QueuedRequest {
  /**
   * Resolves the queued request
   */
  resolve: (value: unknown) => void

  /**
   * Rejects the queued request
   */
  reject: (reason?: any) => void

  /**
   * Timeout reference for the queued request
   */
  timeout: NodeJS.Timeout
}