/* eslint-disable max-classes-per-file */
class FdkInvalidExtensionConfig extends Error {}

class FdkClusterMetaMissingEror extends Error {}

class FdkSessionNotFoundError extends Error {}
class FdkInvalidOAuthError extends Error {}

class FdkInvalidHMacError extends Error {}

class FdkInvalidWebhookConfig extends Error {}

class FdkWebhookRegistrationError extends Error {}

class FdkWebhookProcessError extends Error {}

class FdkWebhookHandlerNotFound extends Error {}

module.exports = {
  FdkInvalidExtensionConfig,
  FdkClusterMetaMissingEror,
  FdkSessionNotFoundError,
  FdkInvalidOAuthError,
  FdkInvalidHMacError,
  FdkInvalidWebhookConfig,
  FdkWebhookRegistrationError,
  FdkWebhookProcessError,
  FdkWebhookHandlerNotFound,
};
