### Executor to wrap Unity Batchmode
Parses logs and retrieve return code

### Usage
NOTE: After using the executor it is important to call and await for cleanup.

UnityRunner module implements the executor. There are several ways to configure unity batchmode executable to be called:
- pass the path to the Unity editor executable
- set an environment variable UNITY_PATH
- add `unity` command to the current environment