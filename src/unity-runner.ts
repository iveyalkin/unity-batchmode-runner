import fs from "fs";
import { spawn } from "child_process";
import path from "path";
import * as stream from "stream";

export interface ILogProcessor {
    process(outputStr: string): string;
}

export interface IErrorLogProcessor {
    process(error: Error): string;
}

export interface UnityRunnerOptions {
    stdoutLogProcessor: ILogProcessor;
    stderrLogProcessor: IErrorLogProcessor;
    unityExecutable?: string;
    outputLogDir?: string;
    stdoutLog?: stream.Writable;
    stderrLog?: stream.Writable;
}

export class UnityRunner {
    private readonly stdoutLogProcessor: ILogProcessor;
    private readonly stderrLogProcessor: IErrorLogProcessor;
    private readonly unityCommand: string = process.env.UNITY_PATH ?? "unity";
    private readonly stdoutLog: stream.Writable;
    private readonly stderrLog: stream.Writable;

    constructor({
        stdoutLogProcessor,
        stderrLogProcessor,
        stdoutLog,
        stderrLog,
        outputLogDir = "./out",
        unityExecutable = process.env.UNITY_EXECUTABLE ?? "unity"
    }: UnityRunnerOptions) {
        this.stdoutLogProcessor = stdoutLogProcessor;
        this.stderrLogProcessor = stderrLogProcessor;
        this.unityCommand = unityExecutable ?? this.unityCommand;

        const outDirPath = fs.mkdirSync(outputLogDir, { recursive: true }) ?? outputLogDir;
        this.stdoutLog = stdoutLog
            ? stdoutLog
            : fs.createWriteStream(path.join(outDirPath, "stdout.log"), { encoding: 'utf8' });
        this.stderrLog = stderrLog
            ? stderrLog
            : fs.createWriteStream(path.join(outDirPath, "stderr.log"), { encoding: 'utf8' });
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

            if (errorStr.length === 0) return;

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

            if (outputStr.length === 0) return;
            
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