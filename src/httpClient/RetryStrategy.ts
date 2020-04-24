export enum RetryStrategy {
    /**
     * Constant delay: baseDelay * factor, e.g. 5, 5, 5, 5, 5 seconds.
     */
    Constant = "constant",
    /**
     * Linear increase: baseDelay * retry attempts, e.g. 2, 4, 6, 8, 10 seconds.
     */
    Linear = "linear",
    /**
     * Exponential increase: baseDelay * (retries ** 2), e.g. r x 1, r x 4, r x 9, r x 16 seconds. Default option.
     */
    Exponential = "exponential"
}
