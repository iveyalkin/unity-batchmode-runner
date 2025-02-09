import fs from "fs";
import { spawn } from "child_process";
import path from "path";

export interface ILogProcessor {
    process(outputStr: string): string;
}

export interface IErrorLogProcessor {
    process(error: Error): string;
}

export class UnityRunner {
    private stdoutLog: fs.WriteStream;
    private stderrLog: fs.WriteStream;

    constructor(
        private readonly stdoutLogProcessor: ILogProcessor,
        private readonly stderrLogProcessor: IErrorLogProcessor,
        outputLogDir: string = "./out",
        private readonly unityCommand: string = process.env.UNITY_PATH ?? "unity"
    ) {
        const outDirPath = fs.mkdirSync(outputLogDir, { recursive: true }) ?? outputLogDir;
        this.stdoutLog = fs.createWriteStream(path.join(outDirPath, "stdout.log"), { encoding: 'utf8' });
        this.stderrLog = fs.createWriteStream(path.join(outDirPath, "stderr.log"), { encoding: 'utf8' });
    }

    public async cleanup(): Promise<void> {
        const promises: Promise<void>[] = [];

        if (this.stdoutLog) {
            promises.push(
                new Promise<void>((resolve) => {
                    try {
                        this.stdoutLog.end(() => resolve());
                    } catch (exception) {
                        console.error(`Failed to close stdout.log: ${exception}`);
                        resolve();
                    }
                })
            );
        }

        if (this.stderrLog) {
            promises.push(
                new Promise<void>((resolve) => {
                    try {
                        this.stderrLog.end(() => resolve());
                    } catch (exception) {
                        console.error(`Failed to close stderr.log: ${exception}`);
                        resolve();
                    }
                })
            );
        }

        await Promise.all(promises);
    }

    public async runUnityBatchmode(args?: string[]): Promise<number> {
        const processArgs = ["-batchmode"];
        if (args) {
            processArgs.push(...args.map(arg => `-${arg.trim()}`));
        }

        const options = {
            detached: false,
            env: process.env
        };

        const childProcess = spawn(this.unityCommand, processArgs, options);

        childProcess.stdout.setEncoding('utf8');
        childProcess.stderr.setEncoding('utf8');

        childProcess.stderr.on("error", (error) => {
            const errorStr = this.stderrLogProcessor.process(error);
            console.error(errorStr);

            try {
                if (!this.stderrLog.write(`${error}`, (subError) => {
                    if (subError)
                        console.error(`Failed to write to stderr.log: ${subError}`);
                })) {
                    console.error("Failed to write to stderr.log");
                }
            } catch (exception) {
                console.error(`Failed to write to stderr.log: ${exception}`);
            }
        });

        childProcess.stdout.on("data", (data) => {
            const dataString = data.toString();
            const outputStr = this.stdoutLogProcessor.process(dataString);
            console.log(outputStr);

            try {
                if (!this.stdoutLog.write(dataString, (subError) => {
                    if (subError)
                        console.error(`Failed to write to stdout.log: ${subError}`);
                })) {
                    console.error("Failed to write to stdout.log");
                }
            } catch (exception) {
                console.error(`Failed to write to stdout.log: ${exception}`);
            }
        });

        return await new Promise((resolve, _) => {
            childProcess.on("exit", (code) => {
                console.log(`Unity Batchmode process exited with code ${code}`);
                if (code !== null) {
                    resolve(code);
                } else {
                    console.log("Unity Batchmode process exited with undefined code. Default to 0");
                    resolve(0);
                }
            });

            childProcess.on("error", (error) => {
                console.error(`Error: ${error}`);
                resolve(-1);
            });
        });
    }
}