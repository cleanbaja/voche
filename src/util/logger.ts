export enum RunLevel {
    Debug = 1,
    Info,
    Warn,
    Error,
}

export class Logger {
    scope: string;
    runlevel: RunLevel;

    constructor(scope: string, runlevel: RunLevel) {
        this.scope = scope;
        this.runlevel = runlevel;
    }

    private canPrint(scope: RunLevel) {
        if (scope >= this.runlevel) {
            return true;
        } else {
            return false;
        }
    }

    debug(msg: any, obj?: any) {
        if (!this.canPrint(RunLevel.Debug))
            return;

        console.log(this.scope + ': ' + msg);
    
        if (obj)
            console.log(obj);
    }

    info(msg: any, obj?: any) {
        if (!this.canPrint(RunLevel.Info))
            return;

        console.log(this.scope + ': ' + msg);
    
        if (obj)
            console.log(obj);
    }

    warn(msg: any) {
        if (!this.canPrint(RunLevel.Warn))
            return;

        console.log(this.scope + ': ' + msg);
    }

    error(msg: any) {
        if (!this.canPrint(RunLevel.Error))
            return;

        console.error(this.scope + ': ' + msg);
    }
}

/**
 * Creates a logger for use in debugging
 * 
 * @param scope prefix for logger to use
 * @param runlevel level of log output to mask/print
 * @returns logger object
 */
export function createLogger(scope: string, runlevel?: RunLevel) {
    // enable warn/error messages by default
    return new Logger(scope, runlevel || RunLevel.Warn);
}