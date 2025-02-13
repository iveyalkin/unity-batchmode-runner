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

    getInsights(): string[];
}

export class LogProcessor implements unity.ILogProcessor {
    constructor(
        public readonly process: (dataStr: string) => string,
    ) { }
}

export class SimpleValidator implements ILogInsight {
    private readonly insights: string[] = [];

    getInsights(): string[] {
        return this.insights;
    }

    push(insight: string): void {
        this.insights.push(insight);
    }

    lookup(outputStr: string): boolean {
        return outputStr.length > 0;
    }
}

export class LogValidator implements ILogInsight {
    private readonly keywords?: string[];
    private readonly insights: string[] = [];

    constructor(keywords?: string[],
        private readonly rule?: RegExp
    ) {
        this.keywords = keywords
            ? [...new Set(keywords?.map(kw => kw.toLowerCase()))]
            : keywords;
    }

    getInsights(): string[] {
        return this.insights;
    }

    push(insight: string): void {
        this.insights.push(insight);
    }

    lookup(outputStr: string): boolean {
        outputStr = outputStr.toLowerCase();
        if (this.keywords)
            if (this.keywords.some(kw => outputStr.includes(kw)))
                return true;

        if (this.rule)
            return this.rule.test(outputStr);

        return false;
    }
}

export class DefaultLogProcessorArgs {
    validator?: ILogInsight;
    formatter?: (header: string, body?: string) => string;
}

export class DefaultLogProcessor extends LogProcessor {
    constructor(args: DefaultLogProcessorArgs = new DefaultLogProcessorArgs()) {
        super((outputStr: string): string => {
            outputStr = outputStr.trim();
            if (outputStr.length === 0) return outputStr;

            const headlineEndIndex = outputStr.indexOf("\n");
            const headline = headlineEndIndex > 0
                ? outputStr.slice(0, headlineEndIndex).trim()
                : outputStr;

            if (args.validator?.lookup(outputStr))
                args.validator.push(headline);

            if (headlineEndIndex <= 0 || headlineEndIndex === outputStr.length - 1)
                return args.formatter
                    ? args.formatter(headline)
                    : `${headline}\n`;

            const body = outputStr.slice(headlineEndIndex + 1).trim();
            return args.formatter
                ? args.formatter(headline, body)
                : `${headline}\n${body}\n`;
        });
    }
}