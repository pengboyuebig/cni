export declare class Logger {
    private verbose;
    constructor(verbose?: boolean);
    setVerbose(verbose: boolean): void;
    info(msg: string): void;
    success(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
    debug(msg: string): void;
    plain(msg: string): void;
    heading(msg: string): void;
    summary(hits: number, misses: number, failed: number, elapsed: number): void;
}
//# sourceMappingURL=logger.d.ts.map