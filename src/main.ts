#!/usr/bin/env node

import * as unity from "./unity-runner";
import * as processors from "./default-implementation";

main().catch(err => {
    console.error(err);
    process.exit(1);
});

async function main() {
    const outValidator = new processors.LogValidator(["error"]);

    const outLogProcessor = new processors.DefaultLogProcessor("", "", outValidator);
    const errLogProcessor = new processors.DefaultErrorLogProcessor();
    const runner = new unity.UnityRunner(outLogProcessor, errLogProcessor);

    await runner.runUnityBatchmode(["error from the hallway"]);

    if (outValidator.insights.length > 0) {
        console.log(`Insights:\n\t- ${outValidator.insights.join("\n\t- ")}\n`);
    }

    await runner.cleanup();
}

