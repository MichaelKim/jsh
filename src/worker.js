// @flow

import type { Source, Sink, StdLib, PID, ProcessBody } from "./types";

type MessageEvent = {|
  +data: MessageData
|};
type MessageData =
  | {|
      +type: "START"
    |}
  | {|
      +type: "SPAWN_RETURN",
      +value: PID
    |}
  | {|
      +type: "SPAWN_MULTIPLE_RETURN",
      +value: Array<PID>
    |}
  | {|
      +type: "WAIT_RETURN"
    |}
  | {|
      +type: "READ_RETURN",
      +value: string
    |};

// Flow thinks this file exports nothing when required, but actually
// it is passed through a loader by webpack and returns a string.
/*::
  module.exports = '';
*/

// Start of web worker code
(_pid: PID, _body: string) => {
  // Flow types for methods in the worker global scope.
  /*::
  const postMessage: (data: any) => void = () => {};
  const addEventListener: (
    type: "message",
    callback: (e: MessageEvent) => void | Promise<void>
  ) => void = () => {};
  const eval: string => Function = () => () => {};
  */

  function debug(test) {
    console.log("FROM " + _pid + ":", test);
  }

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
      const std = {
        pid: _pid,
        read: stdin.read,
        print: stdout.print,
        test: function(str) {
          stdout.print("TESTING GLOBAL: " + str);
        },
        spawn: spawn,
        wait: wait,
        start: start,
        spawnMultiple: spawnMultiple
      };
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
    }
  });
};
