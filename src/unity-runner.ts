import fs from "fs";
import { spawn, SpawnOptionsWithStdioTuple, StdioPipe, StdioNull } from "child_process";
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
    shell?: boolean | "bash" | "sh" | "zsh" | string;
}

export class UnityRunner {
    private readonly stdoutLogProcessor: ILogProcessor;
    private readonly stderrLogProcessor: IErrorLogProcessor;
    private readonly unityCommand: string = process.env.UNITY_PATH ?? "unity";
    private readonly stdoutLog: stream.Writable;
    private readonly stderrLog: stream.Writable;

    private readonly spawnOptions: SpawnOptionsWithStdioTuple<StdioNull, StdioPipe, StdioPipe> = {
        detached: false,
        stdio: ["ignore", "pipe", "pipe"],
        env: process.env
    };

    constructor({
        stdoutLogProcessor,
        stderrLogProcessor,
        stdoutLog,
        stderrLog,
        outputLogDir = "./out",
        unityExecutable = process.env.UNITY_EXECUTABLE ?? "unity",
        shell = false
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

        this.spawnOptions.shell = shell;
    }

    public async cleanup(): Promise<void> {
        const promises: Promise<void>[] = [];

        if (this.stdoutLog) {
            promises.push(
                new Promise<void>((resolve) => {
                    try {
                        this.stdoutLog.end(() => resolve());
                    } catch (exception) {
                        process.stderr.write(`Failed to close stdout.log: ${exception}\n`);
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
                        process.stderr.write(`Failed to close stderr.log: ${exception}\n`);
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

        const childProcess = spawn(this.unityCommand, processArgs, this.spawnOptions);

        childProcess.stdout.setEncoding('utf8');
        childProcess.stderr.setEncoding('utf8');

        childProcess.stderr.on("error", (error) => {
            const errorStr = this.stderrLogProcessor.process(error);

            if (errorStr.length === 0) return;

            process.stderr.write(errorStr);

            try {
                if (!this.stderrLog.write(`${error}`, (subError) => {
                    if (subError)
                        process.stderr.write(`Failed to write to stderr.log: ${subError}\n`);
                })) {
                    process.stderr.write("Failed to write to stderr.log\n");
                }
            } catch (exception) {
                process.stderr.write(`Failed to write to stderr.log: ${exception}\n`);
            }
        });

        childProcess.stdout.on("data", (data) => {
            const dataString = data.toString();
            const outputStr = this.stdoutLogProcessor.process(dataString);

            if (outputStr.length === 0) return;

            process.stdout.write(outputStr);

            try {
                if (!this.stdoutLog.write(dataString, (subError) => {
                    if (subError)
                        process.stderr.write(`Failed to write to stdout.log: ${subError}\n`);
                })) {
                    process.stderr.write("Failed to write to stdout.log\n");
                }
            } catch (exception) {
                process.stderr.write(`Failed to write to stdout.log: ${exception}\n`);
            }
        });

        return await new Promise((resolve, _) => {
            childProcess.on("exit", (code) => {
                process.stdout.write(`Unity Batchmode process exited with code ${code}\n`);
                if (code !== null) {
                    resolve(code);
                } else {
                    process.stdout.write("Unity Batchmode process exited with undefined code. Default to 0\n");
                    resolve(0);
                }
            });

            childProcess.on("error", (error) => {
                process.stderr.write(`Error: ${error}\n`);
                resolve(-1);
            });
        });
    }
}