// @flow

const { InputStream, OutputStream, debug } = require("./stdio");
const workerFile: string = require("./worker");

import type {
  InputStream as IS,
  OutputStream as OS,
  ProcessPoolType,
  ProcessType,
  ProcessMessageData,
  PID,
  StdLib,
  ProcessBody
} from "./types";

/*::
let window: {|
  URL: {
    createObjectURL: (blob: Blob) => string,
    revokeObjectURL: (blobURL: string) => void
  }
|};

let eval: string => Function;
*/

function ProcessPool(): ProcessPoolType {
  const _processList: {
    [pid: PID]: {
      process: ProcessType,
      finishCallbacks: Array<() => void>
    }
  } = {};

  function Process(
    pid: PID,
    stdin: IS,
    stdout: OS,
    body: ProcessBody | string
  ): ProcessType {
    let _finishCallback = null;
    const blob = new Blob([generateWebWorkerCode(pid, body)]);
    const blobURL = window.URL.createObjectURL(blob);
    const worker = new Worker(blobURL);

    worker.onmessage = async e => {
      const data: ProcessMessageData = (e.data: any);
      if (data.type === "READ") {
        debug("await reading");
        const text = await stdin.read();
        worker.postMessage({
          type: "READ_RETURN",
          value: text
        });
      } else if (data.type === "PRINT") {
        const text = data.value;
        debug("GOT PRINT: " + text);
        stdout.print(text);
      } else if (data.type === "SPAWN") {
        const childBody = data.body;
        const childSource = data.source;
        const childSink = data.sink;

        let childStdin = stdin;
        if (childSource) {
          childStdin = new InputStream(deserialize(childSource));
        }

        let childStdout = stdout;
        if (childSink) {
          childStdout = new OutputStream(deserialize(childSink));
        }

        const childPid = createProcess(childStdin, childStdout, childBody);

        debug("created child process: " + childPid);
        worker.postMessage({
          type: "SPAWN_RETURN",
          value: childPid
        });
      } else if (data.type === "SPAWN_MULTIPLE") {
        const bodies = data.bodies.split("@@@");
        let pids = [];

        let childSink = stdin;
        for (let i = bodies.length - 1; i >= 0; i--) {
          const childBody = bodies[i];
          const childStdin = i === 0 ? stdin : new InputStream();

          const childStdout =
            i === bodies.length - 1 ? stdout : new OutputStream(childSink);
          const childPid = createProcess(childStdin, childStdout, childBody);
          pids.unshift(childPid);

          childSink = childStdin;
        }

        worker.postMessage({
          type: "SPAWN_MULTIPLE_RETURN",
          value: pids
        });
      } else if (data.type === "WAIT") {
        const pid = data.value;
        if (_processList[pid]) {
          _processList[pid].finishCallbacks.push(() =>
            worker.postMessage({ type: "WAIT_RETURN" })
          );
        }
      } else if (data.type === "START_OTHER") {
        const pid = data.value;
        debug("STARTING PROCESS " + pid);
        startProcess(pid);
      } else if (data.type === "FINISH") {
        close();
      }
    };

    function start() {
      worker.postMessage({
        type: "START"
      });
    }

    function onFinish(callback: () => void) {
      _finishCallback = callback;
    }

    function close() {
      debug("closing " + pid);
      window.URL.revokeObjectURL(blobURL);
      worker.terminate();
      if (_finishCallback) _finishCallback();
    }

    return {
      start,
      onFinish
    };
  }

  function createProcess(
    stdin: IS,
    stdout: OS,
    body: ProcessBody | string
  ): PID {
    const pid = _generateNewPID();

    const process = new Process(pid, stdin, stdout, body);
    _processList[pid] = {
      process: process,
      finishCallbacks: []
    };

    process.onFinish(() => {
      debug("running callbacks for " + pid);
      _processList[pid].finishCallbacks.forEach(cb => cb());
    });

    return pid;
  }

  function startProcess(pid: PID): void {
    if (_processList[pid]) {
      _processList[pid].process.start();
    }
  }

  async function waitProcess(pid: PID): Promise<void> {
    return new Promise<void>(resolve => {
      if (_processList[pid]) {
        _processList[pid].process.onFinish(resolve);
      }
    });
  }

  function _generateNewPID(): PID {
    let pid = (Math.random() * 1000) | 0;
    while (_processList[pid]) {
      pid = (Math.random() * 1000) | 0;
    }
    return pid;
  }

  return Object.freeze({ createProcess, startProcess, waitProcess });
}

function deserialize(str: string): Object {
  const parsed: { [string]: string } = JSON.parse(str);
  return Object.keys(parsed).reduce(
    (acc, key) => ({ ...acc, [key]: eval("(" + parsed[key] + ")") }),
    {}
  );
}

function generateWebWorkerCode(pid: PID, body) {
  return `(${workerFile})(${pid}, String(${body.toString()}))`;
}

module.exports = ProcessPool;
