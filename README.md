### Executor to wrap Unity Batchmode
Parses logs and retrieve return code

### Usage
NOTE: After using the executor it is important to call and await for a cleanup.

```typescript
const unityRunner = new UnityRunner(..);
await unityRunner.runUnityBatchmode(..);
await unityRunner.cleanup();
```

UnityRunner module implements the executor. There are several ways to configure Unity Batchmode executable to be called:
- pass the path to the Unity editor executable
- set an environment variable UNITY_EXECUTABLE
- add `unity` command to the current environment