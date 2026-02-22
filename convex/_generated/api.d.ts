/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as alerts from "../alerts.js";
import type * as analyzeCall from "../analyzeCall.js";
import type * as calls from "../calls.js";
import type * as healthVideos from "../healthVideos.js";
import type * as http from "../http.js";
import type * as memories from "../memories.js";
import type * as patients from "../patients.js";
import type * as pollVideo from "../pollVideo.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  alerts: typeof alerts;
  analyzeCall: typeof analyzeCall;
  calls: typeof calls;
  healthVideos: typeof healthVideos;
  http: typeof http;
  memories: typeof memories;
  patients: typeof patients;
  pollVideo: typeof pollVideo;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
