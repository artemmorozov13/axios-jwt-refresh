import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError, AxiosHeaders } from 'axios'
import Cookies from 'js-cookie'
import { 
  CookieTokenHandler, 
  TokenRefreshOptions, 
  QueuedRequest 
} from './types/types'

/**
 * Default cookie handler implementation using js-cookie
 * @constant
 */
const defaultCookieHandler: CookieTokenHandler = {
  get: (key: string) => Cookies.get(key),
  set: (key: string, value: string, options?: any) => Cookies.set(key, value, options),
  remove: (key: string, options?: any) => Cookies.remove(key, options)
}

/**
 * Creates an Axios request interceptor middleware for automatic JWT token refresh
 * @template T - Type of the response data from refresh endpoint
 * @param {TokenRefreshOptions<T>} options - Configuration options
 * @returns {Promise<InternalAxiosRequestConfig>} Axios request interceptor
 * @example
 * axios.interceptors.request.use(
 *   createTokenRefreshMiddleware({
 *     refreshTokenUrl: '/api/auth/refresh',
 *     accessTokenCookieOptions: { secure: true }
 *   })
 * )
 */
export const createTokenRefreshMiddleware = <T = any>(
  options: TokenRefreshOptions<T>
) => {
  // Configuration with defaults
  const {
    accessTokenKey = 'accessToken',
    refreshTokenKey = 'refreshToken',
    refreshTokenUrl,
    accessTokenCookieOptions = { path: '/' },
    refreshTokenCookieOptions = { path: '/' },
    timeoutRequest = 30000,
    getAccessToken = (response) => (response.data as any).accessToken,
    getRefreshToken,
    onRefreshSuccess,
    onRefreshError,
    onMissingTokens,
    shouldInterceptRequest = () => true,
    transformRefreshRequest = (config) => config,
    transformRetryRequest = (config, newAccessToken) => {
      const headers = new AxiosHeaders(config.headers)
      headers.set('Authorization', `Bearer ${newAccessToken}`)
      return { ...config, headers }
    },
    maxRefreshAttempts = 1,
    refreshRetryDelay = 1000,
    cookieHandler = defaultCookieHandler
  } = options

  // State variables
  let isRefreshing = false
  let refreshSubscribers: QueuedRequest[] = []
  let refreshAttempts = 0

  /**
   * Process all queued requests after token refresh
   * @param {AxiosError} [error] - Optional error to reject all requests with
   */
  const processQueue = (error?: AxiosError) => {
    refreshSubscribers.forEach((subscriber) => {
      if (error) {
        subscriber.reject(error)
      } else {
        subscriber.resolve(true)
      }
      clearTimeout(subscriber.timeout)
    })
    refreshSubscribers = []
  }

  /**
   * Attempt to refresh the access token using refresh token
   * @returns {Promise<string>} New access token
   * @throws {AxiosError} When refresh fails
   */
  const refreshTokens = async (): Promise<string> => {
    try {
      const refreshToken = cookieHandler.get(refreshTokenKey)
      
      if (!refreshToken) {
        onMissingTokens?.()
        throw new Error('No refresh token available')
      }

      const headers = new AxiosHeaders()
      headers.set('Authorization', `Bearer ${refreshToken}`)

      let refreshConfig: InternalAxiosRequestConfig = {
        url: refreshTokenUrl,
        method: 'POST',
        headers
      }

      refreshConfig = transformRefreshRequest(refreshConfig)

      const response = await axios(refreshConfig)
      const newAccessToken = getAccessToken(response)
      
      if (!newAccessToken) {
        throw new Error('Refresh response did not contain access token')
      }

      cookieHandler.set(accessTokenKey, newAccessToken, accessTokenCookieOptions)
      
      if (getRefreshToken) {
        const newRefreshToken = getRefreshToken(response)
        if (newRefreshToken) {
          cookieHandler.set(refreshTokenKey, newRefreshToken, refreshTokenCookieOptions)
        }
      }

      onRefreshSuccess?.(response, newAccessToken)
      refreshAttempts = 0
      return newAccessToken
    } catch (error) {
      refreshAttempts++
      
      if (refreshAttempts < maxRefreshAttempts) {
        await new Promise(resolve => setTimeout(resolve, refreshRetryDelay))
        return refreshTokens()
      }

      cookieHandler.remove(accessTokenKey, accessTokenCookieOptions)
      cookieHandler.remove(refreshTokenKey, refreshTokenCookieOptions)
      
      const axiosError = error as AxiosError
      onRefreshError?.(axiosError)
      throw axiosError
    }
  }

  return async (config: InternalAxiosRequestConfig) => {
    if (!shouldInterceptRequest(config)) {
      return config
    }

    const accessToken = cookieHandler.get(accessTokenKey)
    
    // Add current access token if available
    if (accessToken) {
      const headers = new AxiosHeaders(config.headers)
      headers.set('Authorization', `Bearer ${accessToken}`)
      return { ...config, headers }
    }

    const refreshToken = cookieHandler.get(refreshTokenKey)
    
    // If no refresh token, continue (will fail with 401)
    if (!refreshToken) {
      onMissingTokens?.()
      return config
    }

    // If already refreshing, add to queue
    if (isRefreshing) {
      return new Promise<InternalAxiosRequestConfig>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Token refresh timeout'))
        }, timeoutRequest)

        refreshSubscribers.push({
          resolve: () => {
            const newAccessToken = cookieHandler.get(accessTokenKey)
            if (newAccessToken) {
              resolve(transformRetryRequest(config, newAccessToken))
            } else {
              reject(new Error('Failed to get new access token'))
            }
          },
          reject,
          timeout
        })
      })
    }

    // Start refresh process
    isRefreshing = true
    try {
      const newAccessToken = await refreshTokens()
      processQueue()
      return transformRetryRequest(config, newAccessToken)
    } catch (error) {
      processQueue(error as AxiosError)
      throw error
    } finally {
      isRefreshing = false
    }
  }
}