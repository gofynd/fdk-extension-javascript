export type RetryInfo = {
    isRetryInProgress: boolean;
    isRetry: boolean;
    retryCount: number;
    retryTimer: NodeJS.Timeout | null;
    fn: Function;
    args: any[];
};
export type RetryInfoMap = Map<string, RetryInfo>;
export class RetryManger {
    static shouldRetryOnError(err: any): boolean;
    retryInfoMap: RetryInfoMap;
    retry(uniqueKey: any, fn: any, ...args: any[]): any;
    _getNextRetrySeconds(retryCount: any): number;
    _makeRetry(uniqueKey: any): any;
    resetRetryState(uniqueKey: any): void;
    isRetryInProgress(uniqueKey: any): boolean;
}
