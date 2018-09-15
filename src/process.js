// @flow

const { InputStream, OutputStream, debug } = require("./stdio");

import type {
  InputStream as IS,
  OutputStream as OS,
  ProcessPoolType,
  ProcessType,
  ProcessMessageData,
  PID,
  StdLib
} from "./types";

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
    body: ((std: StdLib) => Promise<void>) | string
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
    body: ((std: StdLib) => Promise<void>) | string
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

function deserialize(str: string): any {
  const parsed = JSON.parse(str);
  return Object.keys(parsed).reduce(
    (acc, key) => ({ ...acc, [key]: eval("(" + parsed[key] + ")") }),
    {}
  );
}

function generateWebWorkerCode(pid: PID, body) {
  return `
function debug(test) {
console.log("FROM ${pid}:", test);
}

function InputStream(source) {
let buffer = [];
let readCallback = null;

this.read = function() {
  return new Promise(resolve => {
    if (buffer.length > 0) {
      debug("inputstream: read from buffer");
      const str = buffer.shift();
      resolve(str);
    } else {
      debug("inputstream: waiting read from callback");
      postMessage({
        type: 'READ'
      });
      readCallback = resolve;
    }
  });
};

this.send = function(str) {
  debug('inputstream: received "' + str + '"');
  if (readCallback) {
    debug("inputstream: send to callback");
    readCallback(str);
    readCallback = null;
  } else {
    debug("inputstream: save to buffer");
    buffer.push(str);
  }
};

if (source) source.recieve(this.send);
}

function OutputStream(sink) {
this.print = function(str) {
  sink.send(str);
};
}

const stdin = new InputStream({
recieve: function(callback) {
  addEventListener('message', e => {
    if (e.data.type === 'READ_RETURN') {
      const str = e.data.value;
      callback(str);
    }
  });
}
});

const stdout = new OutputStream({
send: function(str) {
  debug('PRINTING ' + str);
  postMessage({
    type: 'PRINT',
    value: str
  });
}
});

let spawnCallback = null;
async function spawn(body, source, sink) {
return new Promise(resolve => {
  spawnCallback = resolve;
  postMessage({
    type: 'SPAWN',
    body: body.toString(),
    source: source ? serialize(source) : null,
    sink: sink ? serialize(sink) : null
  });
});
}

let waitCallback = null;
async function wait(pid) {
return new Promise(resolve => {
  waitCallback = resolve;
  postMessage({
    type: 'WAIT',
    value: pid
  });
});
}

let spawnMultipleCallback = null;
function spawnMultiple(...bodies) {
return new Promise(resolve => {
  spawnMultipleCallback = resolve;
  postMessage({
    type: 'SPAWN_MULTIPLE',
    bodies: bodies.join('@@@')
  });
});
}

function start(pid) {
postMessage({
  type: 'START_OTHER',
  value: pid
});
}

function serialize(obj) {
return JSON.stringify(
  Object.keys(obj).reduce(
    (acc, key) => ({
      ...acc,
      [key]: obj[key].toString()
    }),
    {}
  )
);
}

addEventListener('message', async e => {
if (e.data.type === 'START') {
  const body = ${body.toString()};
  const std = {
    pid: ${pid},
    read: stdin.read,
    print: stdout.print,
    test: function(str) {
      stdout.print('TESTING GLOBAL: ' + str);
    },
    spawn: spawn,
    wait: wait,
    start: start,
    spawnMultiple: spawnMultiple
  };
  await body(std);
  postMessage({
    type: 'FINISH'
  });
} else if (e.data.type === 'SPAWN_RETURN') {
  const pid = e.data.value;
  if (spawnCallback) {
    spawnCallback(pid);
    spawnCallback = null;
  }
} else if (e.data.type === 'SPAWN_MULTIPLE_RETURN') {
  const pids = e.data.value;
  if (spawnMultipleCallback) {
    spawnMultipleCallback(pids);
    spawnMultipleCallback = null;
  }
} else if (e.data.type === 'WAIT_RETURN') {
  if (waitCallback) {
    waitCallback();
    waitCallback = null;
  }
}
});
`;
}

module.exports = ProcessPool;
