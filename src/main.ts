#!/usr/bin/env node

import * as unity from "./unity-runner";
import * as processors from "./default-implementation";

main().catch(err => {
    console.error(err);
    process.exit(1);
});

async function main() {
    const outValidator = new processors.LogValidator(["error", "fail", "not valid", "invalid", "trouble", "exception", "fatal", "critical", "unhandled" ]);
    const errValidator = new processors.SimpleValidator();
    const outLogProcessor = new processors.DefaultLogProcessor({validator: outValidator});
    const errLogProcessor = new processors.DefaultLogProcessor({validator: errValidator});
    const runner = new unity.UnityRunner({stdoutLogProcessor: outLogProcessor, stderrLogProcessor: errLogProcessor});
    const args = process.argv.slice(2);  // Skip 'node' and script name

    if (args.length === 0) {
        console.log("No arguments provided. Running Unity in default mode.");
    }

    await runner.runUnityBatchmode(args);

    console.log(`Insights:\n\t- ${outValidator.getInsights().join("\n\t- ")}\n`);
}

