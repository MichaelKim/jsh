function ProcessPool() {
  const processList = {};
  function createProcess(stdin, stdout, body) {
    let pid = (Math.random() * 1000) | 0;
    while (processList[pid]) {
      pid = (Math.random() * 1000) | 0;
    }

    const p = new Process(pid, stdin, stdout, body);
    processList[pid] = {
      process: p,
      callback: []
    };
    p.onFinish(() => {
      debug("running callbacks for " + pid);
      processList[pid].callback.forEach(cb => cb());
    });

    return pid;
  }

  function startProcess(pid) {
    if (processList[pid]) {
      processList[pid].process.start();
    }
  }

  function Process(pid, stdin, stdout, body) {
    this.pid = pid;

    let finishCallback = null;
    const blob = new Blob([
      `
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
      postMessage({
        type: 'SPAWN',
        body: body.toString(),
        source: source ? serialize(source) : null,
        sink: sink ? serialize(sink) : null
      });
      spawnCallback = resolve;
    });
  }

  let waitCallback = null;
  async function wait(pid) {
    return new Promise(resolve => {
      postMessage({
        type: 'WAIT',
        value: pid
      });
      waitCallback = resolve;
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
        start: start
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
    } else if (e.data.type === 'WAIT_RETURN') {
      if (waitCallback) {
        waitCallback();
        waitCallback = null;
      }
    }
  });
    `
    ]);
    const blobURL = window.URL.createObjectURL(blob);
    const worker = new Worker(blobURL);

    worker.onmessage = async e => {
      if (e.data.type === "READ") {
        debug("await reading");
        const text = await stdin.read();
        worker.postMessage({
          type: "READ_RETURN",
          value: text
        });
      } else if (e.data.type === "PRINT") {
        const text = e.data.value;
        debug("GOT PRINT: " + text);
        stdout.print(text);
      } else if (e.data.type === "SPAWN") {
        const childBody = e.data.body;
        const childSource = e.data.source;
        const childSink = e.data.sink;

        let childStdin = null;
        if (childSource) {
          childStdin = new InputStream(deserialize(childSource));
        }

        let childStdout = null;
        if (childSink) {
          childStdout = new OutputStream(deserialize(childSink));
        }

        const childPid = createProcess(childStdin, childStdout, childBody);

        debug("created child process: " + childPid);
        worker.postMessage({
          type: "SPAWN_RETURN",
          value: childPid
        });
      } else if (e.data.type === "WAIT") {
        const pid = e.data.value;
        if (processList[pid]) {
          processList[pid].callback.push(() =>
            worker.postMessage({ type: "WAIT_RETURN" })
          );
        }
      } else if (e.data.type === "START_OTHER") {
        const pid = e.data.value;
        debug("STARTING PROCESS " + pid);
        startProcess(pid);
      } else if (e.data.type === "FINISH") {
        this.close();
      }
    };

    this.start = function() {
      worker.postMessage({
        type: "START"
      });
    };

    this.onFinish = function(callback) {
      finishCallback = callback;
    };

    this.close = function() {
      debug("closing " + this.pid);
      window.URL.revokeObjectURL(blobURL);
      worker.terminate();
      if (finishCallback) finishCallback();
    };
  }

  return {
    createProcess,
    startProcess
  };
}

function deserialize(str) {
  const parsed = JSON.parse(str);
  return Object.keys(parsed).reduce(
    (acc, key) => ({ ...acc, [key]: eval("(" + parsed[key] + ")") }),
    {}
  );
}
