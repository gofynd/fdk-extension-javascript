import type { Router } from "express";
import type { BaseStorage } from "./storage";

export type AccessMode = "online" | "offline";

export interface StorageAdapter {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<unknown>;
  del(key: string): Promise<unknown>;
  setex(key: string, value: unknown, ttl: number): Promise<unknown>;
}

export interface ExtensionCallbacks {
  auth(data: unknown): Promise<void> | void;
  uninstall(data: unknown): Promise<void> | void;
}

export type WebhookProvider = "rest" | "kafka" | "pub_sub" | "temporal" | "sqs" | "event_bridge";

export interface WebhookEventConfig {
  version: string | number;
  handler?: (eventName: string, payload: unknown, companyId: number, applicationId?: number) => Promise<void> | void;
  provider?: WebhookProvider;
  topic?: string;
  queue?: string;
  workflow_name?: string;
  event_bridge_name?: string;
  filters?: Record<string, unknown>;
  reducer?: Record<string, unknown>;
}

export interface WebhookConfig {
  api_path: string;
  notification_email: string;
  subscribe_on_install?: boolean;
  subscribed_saleschannel?: "all" | "specific";
  subscribed_saleschannel_ids?: Array<string | number>;
  marketplace?: boolean;
  event_map: Record<string, WebhookEventConfig>;
}

export interface SetupFdkConfig {
  api_key: string;
  api_secret: string;
  base_url?: string;
  scopes?: string[];
  callbacks: ExtensionCallbacks;
  storage: BaseStorage | StorageAdapter;
  access_mode?: AccessMode;
  webhook_config?: WebhookConfig;
  debug?: boolean;
  cluster?: string;
}

export interface WebhookRegistry {
  readonly isInitialized: boolean;
  syncEvents(platformClient: unknown, config?: WebhookConfig, enableWebhooks?: boolean): Promise<void>;
  processWebhook(req: unknown): Promise<void>;
  verifySignature(req: unknown): void;
}

export interface Extension {
  readonly isInitialized: boolean;
  getPlatformConfig(companyId: number | string): Promise<unknown>;
  getPlatformClient(companyId: number | string, session: unknown): Promise<unknown>;
  getPartnerConfig(organizationId: number | string): unknown;
  getPartnerClient(organizationId: number | string, session: unknown): Promise<unknown>;
  webhookRegistry: WebhookRegistry;
}

export interface FdkClient {
  fdkHandler: Router;
  extension: Extension;
  apiRoutes: Router;
  platformApiRoutes: Router;
  partnerApiRoutes: Router;
  applicationProxyRoutes: Router;
  webhookRegistry: WebhookRegistry;
  getPlatformClient(companyId: number | string): Promise<unknown>;
  getPartnerClient(organizationId: number | string): Promise<unknown>;
  getApplicationClient(applicationId: number | string, applicationToken: string): Promise<unknown>;
}

export function setupFdk(config: SetupFdkConfig, syncInitialization: true): Promise<FdkClient>;
export function setupFdk(config: SetupFdkConfig, syncInitialization?: false): FdkClient;
