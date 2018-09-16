import type { Source, Sink, StdLib, PID } from "./types";

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

// Start of web worker code
(_pid, _body) => {
  // let postMessage: (data: any) => void;
  // let addEventListener: (
  //   type: string,
  //   callback: (e: MessageEvent) => void | Promise<void>
  // ) => void = (a) => {};

  function debug(test) {
    console.log("FROM " + _pid + ":", test);
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
            type: "READ"
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
      addEventListener("message", e => {
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
  async function spawn(body, source, sink) {
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
  async function wait(pid) {
    return new Promise(resolve => {
      waitCallback = resolve;
      postMessage({
        type: "WAIT",
        value: pid
      });
    });
  }

  let spawnMultipleCallback = null;
  function spawnMultiple(...bodies) {
    return new Promise(resolve => {
      spawnMultipleCallback = resolve;
      postMessage({
        type: "SPAWN_MULTIPLE",
        bodies: bodies.join("@@@")
      });
    });
  }

  function start(pid) {
    postMessage({
      type: "START_OTHER",
      value: pid
    });
  }

  function serialize(obj) {
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

  addEventListener("message", async e => {
    if (e.data.type === "START") {
      const body = eval("(" + _body + ")");
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
