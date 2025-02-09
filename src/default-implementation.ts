import * as unity from "./unity-runner";

export interface ILogInsight {
    /* 
    *  Lookups if there are any insights in the output string.
    */
    lookup(outputStr: string): boolean;

    /*
    *  Note an arbitrary hint.
    */
    push(insight: string): void;
}

export class LogProcessor implements unity.ILogProcessor {
    constructor(
        public readonly process: (outputStr: string) => string,
    ) 
    {}
}

export class ErrorLogProcessor implements unity.IErrorLogProcessor {
    constructor(
        public readonly process: (error: Error) => string,
    ) 
    {}
}

export class LogValidator implements ILogInsight {
    public readonly insights: string[] = [];

    constructor(
        private readonly keywords?: string[],
        private readonly rule?: RegExp
    ) {}

    push(insight: string): void {
        this.insights.push(insight);
    }

    lookup(outputStr: string): boolean {
        if (this.keywords)
            if (this.keywords.some(kw => outputStr.includes(kw)))
                return true;

        if (this.rule)
            return this.rule.test(outputStr);

        return false;
    }
}

export class DefaultLogProcessor extends LogProcessor {
    constructor(
        headerPrefix: string = "",
        headerSuffix: string = "",
        private readonly validator?: LogValidator
    ) {
        super((outputStr: string): string => {
            const headlineEndIndex = outputStr.indexOf("\n");
            const headline = headlineEndIndex > 0
                ? outputStr.slice(0, headlineEndIndex).trim()
                : outputStr.trim();

                console.log(`headline: ${this.validator}`);
    
            if (this.validator?.lookup(outputStr))
                this.validator.push(headline);
    
            const body = outputStr.slice(headlineEndIndex + 1).trim();
    
            return `${headerPrefix}${headline}${headerSuffix}\n${body}`;
        });
    }
}

export class DefaultErrorLogProcessor extends ErrorLogProcessor {
    constructor(
        headerPrefix: string = "",
        headerSuffix: string = "",
        private readonly validator?: ILogInsight
    ) {
        super((error: Error): string => {
            const header = error.message;
            const body = error.stack;
    
            if (this.validator?.lookup(header))
                this.validator.push(header);
    
            return `${headerPrefix}${header}${headerSuffix}\n${body}`;
        });
    }
}