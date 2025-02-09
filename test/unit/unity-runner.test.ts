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
        const runner = new UnityRunner(mockStdoutProcessor, mockStderrProcessor);
        expect(runner).toBeDefined();
    });

    it('should construct with custom values', () => {
        const runner = new UnityRunner(mockStdoutProcessor, mockStderrProcessor, './test-output', 'echo');
        expect(runner).toBeDefined();
    });
});