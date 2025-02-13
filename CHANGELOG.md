### 0.2.0
- Overhall API and address bugs and requirements during field testing on a real project
- UnityRunner expose the child process object
- UnityRunner awaits child process streams before returning
- Leverage the stream pipes mechanism to properly support backpressure
- Simplify ILogInsight and ILogProcessor default implementations
- Implement a main entry point to simplify package usage

### 0.1.1
- Update test implementation
- Support execution in bash shell environment

### 0.1.0
- Change the expected environment variable name to UNITY_EXECUTABLE

### 0.0.1
- Implement the executor to wrap Unity Batchmode  