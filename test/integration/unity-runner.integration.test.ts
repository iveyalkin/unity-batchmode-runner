import { UnityRunner } from '../../src/unity-runner';
import { ILogProcessor, IErrorLogProcessor } from '../../src/unity-runner';
import fs from 'fs';
import path from 'path';

describe('UnityRunner Integration', () => {
    const testOutputDir = path.join(__dirname, 'test-output');
    let runner: UnityRunner;

    const testLogProcessor: ILogProcessor = {
        process: (data: string) => `[PROCESSED] ${data}`
    };

    const testErrorProcessor: IErrorLogProcessor = {
        process: (error: Error) => `[ERROR] ${error.message}`
    };

    beforeEach(() => {
        // Use 'echo' as mock Unity command for testing
        process.env.UNITY_PATH = process.platform === 'win32' ? 'cmd' : 'echo';
        runner = new UnityRunner({
            stdoutLogProcessor: testLogProcessor,
            stderrLogProcessor: testErrorProcessor,
            outputLogDir: testOutputDir
        });
    });

    afterEach(async () => {
        await runner.cleanup();
        if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true });
        }
    });

    it('should create output directory and log files', async () => {
        const exitCode = await runner.runUnityBatchmode(['test']);
        await runner.cleanup();

        expect(exitCode).toBe(0);
        expect(fs.existsSync(testOutputDir)).toBeTruthy();
        expect(fs.existsSync(path.join(testOutputDir, 'stdout.log'))).toBeTruthy();
        expect(fs.existsSync(path.join(testOutputDir, 'stderr.log'))).toBeTruthy();
    });

    it('should pass arguments correctly to the command', async () => {
        const args = ['arg1', 'arg2', 'arg3'];
        const exitCode = await runner.runUnityBatchmode(args);
        await runner.cleanup();

        expect(exitCode).toBe(0);
        const stdoutContent = fs.readFileSync(path.join(testOutputDir, 'stdout.log'), 'utf8');
        expect(stdoutContent).toContain('-batchmode');
        args.forEach(arg => {
            expect(stdoutContent).toContain(`-${arg}`);
        });
    });

    it('should handle command not found error', async () => {
        process.env.UNITY_PATH = 'non-existent-command';
        const errorRunner = new UnityRunner({
            stdoutLogProcessor: testLogProcessor,
            stderrLogProcessor: testErrorProcessor,
            outputLogDir: testOutputDir
        });

        const exitCode = await errorRunner.runUnityBatchmode();
        await errorRunner.cleanup();
        expect(exitCode).toBe(-1);
    });
});
