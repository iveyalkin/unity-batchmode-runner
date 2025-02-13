### Executor to wrap Unity Batchmode
Parses logs and retrieve return code. [package on npmjs](https://www.npmjs.com/package/@op6yz/unity-batchmode-runner)

### Usage
```typescript
const unityRunner = new UnityRunner(..);
await unityRunner.runUnityBatchmode(..);
```

UnityRunner module implements the executor. There are several ways to configure Unity Batchmode executable to be called:
- pass the path to the Unity editor executable
- set an environment variable UNITY_EXECUTABLE
- add `unity` command to the current environment