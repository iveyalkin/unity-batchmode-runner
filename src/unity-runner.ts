import fs from "fs";
import { spawn, SpawnOptionsWithStdioTuple, StdioPipe, StdioNull, ChildProcess } from "child_process";
import * as process from "process";
import path from "path";
import * as stream from "stream";

export interface ILogProcessor {
    process(dataStr: string): string;
}

export interface UnityRunnerOptions {
    stdoutLogProcessor: ILogProcessor;
    stderrLogProcessor: ILogProcessor;
    unityExecutable?: string;
    outputLogDir?: string;
    stdoutLog?: stream.Writable;
    stderrLog?: stream.Writable;
    shell?: boolean | "bash" | "sh" | "zsh" | string;
}

export class UnityRunner {
    private readonly stdoutTransformer: stream.Transform;
    private readonly stderrTransformer: stream.Transform;
    private readonly unityCommand: string = process.env.UNITY_PATH ?? "unity";
    private readonly stdoutLog: stream.Writable;
    private readonly stderrLog: stream.Writable;

    private childProcess?: ChildProcess;

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
        this.unityCommand = unityExecutable ?? this.unityCommand;

        this.stdoutTransformer = new stream.Stream.Transform({
            autoDestroy: true,
            transform: function (chunk: Buffer, _, callback: stream.TransformCallback) {
                const dataString = chunk.toString();
                const outputStr = stdoutLogProcessor.process(dataString);
                callback(null, outputStr);
            }
        });

        this.stderrTransformer = new stream.Stream.Transform({
            autoDestroy: true,
            transform: function (chunk: Buffer, _, callback: stream.TransformCallback) {
                const dataString = chunk.toString();
                const outputStr = stderrLogProcessor.process(dataString);
                callback(null, outputStr);
            }
        });

        const outDirPath = fs.mkdirSync(outputLogDir, { recursive: true }) ?? outputLogDir;
        this.stdoutLog = stdoutLog
            ? stdoutLog
            : fs.createWriteStream(path.join(outDirPath, "stdout.log"), { encoding: 'utf8' });
        this.stderrLog = stderrLog
            ? stderrLog
            : fs.createWriteStream(path.join(outDirPath, "stderr.log"), { encoding: 'utf8' });

        this.spawnOptions.shell = shell;
    }

    public getUnityProcess(): ChildProcess | undefined {
        return this.childProcess;
    }

    public async runUnityBatchmode(args?: string[]): Promise<number> {
        process.stdout.write(`Running Unity Batchmode. Executor version: ${require("../package.json").version}\n`);

        const processArgs = ["-batchmode"];
        if (args) {
            processArgs.push(...args.map(arg => `-${arg.trim()}`));
        }

        const childProcess = spawn(this.unityCommand, processArgs, this.spawnOptions);

        childProcess.stdout.setEncoding('utf8');
        childProcess.stderr.setEncoding('utf8');

        console.log("child process pid: %d.", childProcess.pid);

        const stdoutRepeater = new stream.PassThrough({ autoDestroy: true });
        stdoutRepeater.on('error', (error) => console.error('Stream error:', error));

        childProcess.stdout.pipe(stdoutRepeater);
        stdoutRepeater.pipe(this.stdoutLog);
        stdoutRepeater.pipe(this.stdoutTransformer).pipe(process.stdout);

        const stderrRepeater = new stream.PassThrough({ autoDestroy: true });
        stderrRepeater.on('error', (error) => console.error('Stream error:', error));

        childProcess.stderr.pipe(stderrRepeater);
        stderrRepeater.pipe(this.stderrLog);
        stderrRepeater.pipe(this.stderrTransformer).pipe(process.stdout);

        return await this.awaitChildProcess(childProcess);
    }

    private async awaitChildProcess(childProcess: ChildProcess): Promise<number> {
        const promises: Promise<number>[] = [];
        promises.push(new Promise<number>((resolve, _) => {
            let stdoutClosed = false;
            childProcess.stdout!.on("close", () => {
                if (stdoutClosed) return;
                stdoutClosed = true;
                resolve(0);
            });

            childProcess.stdout!.on("error", () => {
                if (stdoutClosed) return;
                stdoutClosed = true;
                resolve(0);
            });
        }));

        promises.push(new Promise<number>((resolve, _) => {
            let stderrClosed = false;
            childProcess.stderr!.on("close", () => {
                if (stderrClosed) return;
                stderrClosed = true;
                resolve(0);
            });

            childProcess.stderr!.on("error", () => {
                if (stderrClosed) return;
                stderrClosed = true;
                resolve(0);
            });
        }));

        if (this.stdoutLog) {
            promises.push(
                new Promise<number>((resolve) => {
                    try {
                        this.stdoutLog.end(() => resolve(0));
                    } catch (exception) {
                        process.stderr.write(`Failed to close stdout.log: ${exception}\n`);
                        resolve(0);
                    }
                })
            );
        }

        if (this.stderrLog) {
            promises.push(
                new Promise<number>((resolve) => {
                    try {
                        this.stderrLog.end(() => resolve(0));
                    } catch (exception) {
                        process.stderr.write(`Failed to close stderr.log: ${exception}\n`);
                        resolve(0);
                    }
                })
            );
        }

        promises.push(new Promise<number>((resolve, _) => {
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
                console.error("Child process error:", error);
                resolve(-1);
            });
        }));

        try {
            this.childProcess = childProcess;

            return (await Promise.all(promises)).reduce((acc, code) => acc + code, 0);
        } finally {
            this.childProcess = undefined;
        }
    }
}