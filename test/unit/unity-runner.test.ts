import { UnityRunner } from '../../src/unity-runner';
import { ILogProcessor, IErrorLogProcessor } from '../../src/unity-runner';

describe('UnityRunner', () => {
    let mockStdoutProcessor: ILogProcessor;
    let mockStderrProcessor: IErrorLogProcessor;

    beforeEach(() => {
        mockStdoutProcessor = {
            process: jest.fn().mockImplementation((data: string) => data)
        };
        mockStderrProcessor = {
            process: jest.fn().mockImplementation((error: Error) => error.message)
        };
    });

    it('should construct with default values', () => {
        const runner = new UnityRunner({
            stdoutLogProcessor: mockStdoutProcessor,
            stderrLogProcessor: mockStderrProcessor
        });
        expect(runner).toBeDefined();
    });

    it('should construct with custom values', () => {
        const runner = new UnityRunner({
            stdoutLogProcessor: mockStdoutProcessor,
            stderrLogProcessor: mockStderrProcessor,
            outputLogDir: './test-output',
            unityExecutable: 'echo'
        });
        expect(runner).toBeDefined();
    });
});