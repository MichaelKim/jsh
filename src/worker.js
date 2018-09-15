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
    postMessage({
      type: "SPAWN",
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
      type: "WAIT",
      value: pid
    });
    waitCallback = resolve;
  });
}

let spawnMultipleCallback = null;
function spawnMultiple(...bodies) {
  return new Promise(resolve => {
    postMessage({
      type: "SPAWN_MULTIPLE",
      bodies: bodies.join("@@@")
    });
    spawnMultipleCallback = resolve;
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
      (acc, key) => ({
        ...acc,
        [key]: obj[key].toString()
      }),
      {}
    )
  );
}

addEventListener("message", async e => {
  if (e.data.type === "START") {
    const body = "asdf";
    const std = {
      pid: 123,
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
