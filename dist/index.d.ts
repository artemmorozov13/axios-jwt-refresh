import { InternalAxiosRequestConfig } from 'axios';
import { CreateTokenRefreshMiddleware } from './types';
export declare const createTokenRefreshMiddleware: (options: CreateTokenRefreshMiddleware) => (config: InternalAxiosRequestConfig) => Promise<InternalAxiosRequestConfig<any>>;
