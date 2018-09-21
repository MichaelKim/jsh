// @flow strict

import type {
  Source,
  Sink,
  StdLib,
  PID,
  ProcessBody,
  ProcessMessageData,
  WorkerMessageData
} from "./types";

type MessageEvent = {|
  +data: WorkerMessageData
|};

/*::
  // Flow types for methods in the worker global scope.
  const postMessage: (data: ProcessMessageData) => void = () => {};
  const addEventListener: (
    type: "message",
    callback: (e: MessageEvent) => void | Promise<void>
  ) => void = () => {};
  const eval: string => Function = () => () => {};

  // Flow types for parameters passed by process.js
  const _pid: PID = 0;
  const _body: string = "";
  const _globalNames: Array<string> = [];

  // Flow thinks this file exports nothing when required, but actually
  // it is passed through a loader by webpack and returns a string.
  module.exports = "";
*/

function debug(test) {
  if (process.env.NODE_ENV === "development") {
    console.log("FROM " + _pid + ":", test);
  }
}

let globalCallbacks: { [string]: ?(Promise<any>) => void } = {};
const globals: {
  +[name: string]: (...args: Array<any>) => Promise<any>
} = _globalNames.reduce(
  (acc, name) =>
    Object.assign(acc, {
      [name]: function(...args: Array<any>) {
        return new Promise<any>(resolve => {
          globalCallbacks[name] = resolve;
          postMessage({
            type: "GLOBAL",
            name: name,
            args: args
          });
        });
      }
    }),
  {}
);

function InputStream(source) {
  let buffer: Array<string> = [];
  let readCallback: ?(Promise<string> | string) => void = null;

  this.read = function() {
    return new Promise(resolve => {
      if (buffer.length > 0) {
        debug("inputstream: read from buffer");
        const str = buffer.shift();
        resolve(str);
      } else {
        debug("inputstream: waiting read from callback");
        postMessage({
          type: "READ"
        });
        readCallback = resolve;
      }
    });
  };

  this.send = function(str: string) {
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
  this.print = function(str: string) {
    sink.send(str);
  };
}

const stdin = new InputStream({
  recieve: function(callback) {
    addEventListener("message", (e: MessageEvent) => {
      if (e.data.type === "READ_RETURN") {
        const str = e.data.value;
        callback(str);
      }
    });
  }
});

const stdout = new OutputStream({
  send: function(str) {
    debug("PRINTING " + str);
    postMessage({
      type: "PRINT",
      value: str
    });
  }
});

let spawnCallback = null;
async function spawn(body: ProcessBody, source: ?Source, sink: ?Sink) {
  return new Promise(resolve => {
    spawnCallback = resolve;
    postMessage({
      type: "SPAWN",
      body: body.toString(),
      source: source ? serialize(source) : null,
      sink: sink ? serialize(sink) : null
    });
  });
}

let waitCallback = null;
async function wait(pid: PID) {
  return new Promise(resolve => {
    waitCallback = resolve;
    postMessage({
      type: "WAIT",
      value: pid
    });
  });
}

let spawnMultipleCallback = null;
function spawnMultiple(...bodies: Array<ProcessBody>) {
  return new Promise(resolve => {
    spawnMultipleCallback = resolve;
    postMessage({
      type: "SPAWN_MULTIPLE",
      bodies: bodies.join("@@@")
    });
  });
}

function start(pid: PID) {
  postMessage({
    type: "START_OTHER",
    value: pid
  });
}

function serialize(obj: { +[string]: Function }): string {
  return JSON.stringify(
    Object.keys(obj).reduce(
      (acc, key) =>
        Object.assign(acc, {
          [key]: obj[key].toString()
        }),
      {}
    )
  );
}

addEventListener("message", async (e: MessageEvent) => {
  if (e.data.type === "START") {
    const body: ProcessBody = eval("(" + _body + ")");
    const std: StdLib = Object.assign(
      {
        pid: _pid,
        read: stdin.read,
        print: stdout.print,
        spawn: spawn,
        wait: wait,
        start: start,
        spawnMultiple: spawnMultiple
      },
      globals
    );
    await body(std);
    postMessage({
      type: "FINISH"
    });
  } else if (e.data.type === "SPAWN_RETURN") {
    const pid = e.data.value;
    if (spawnCallback) {
      spawnCallback(pid);
      spawnCallback = null;
    }
  } else if (e.data.type === "SPAWN_MULTIPLE_RETURN") {
    const pids = e.data.value;
    if (spawnMultipleCallback) {
      spawnMultipleCallback(pids);
      spawnMultipleCallback = null;
    }
  } else if (e.data.type === "WAIT_RETURN") {
    if (waitCallback) {
      waitCallback();
      waitCallback = null;
    }
  } else if (e.data.type === "GLOBAL_RETURN") {
    const name = e.data.name;
    const value = e.data.value;
    const cb = globalCallbacks[name];
    if (cb) {
      cb(value);
      delete globalCallbacks[name];
    }
  }
});
