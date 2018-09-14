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
    postMessage({
      type: 'PRINT',
      value: str
    });
  }
});

let spawnCallback = null;
async function spawn(body) {
  return new Promise(resolve => {
    postMessage({
      type: 'SPAWN',
      value: body.toString()
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
      wait: wait
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
      stdout.print(text);
    } else if (e.data.type === "SPAWN") {
      const body = e.data.value;
      const childPid = createProcess(stdin, stdout, body);

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

// From keyboard
const source = {
  recieve: function(callback) {
    const keyboard = document.getElementById("keyboard");
    keyboard.addEventListener("keypress", event => {
      debug("mainInput: press", event.key);

      if (event.key === "Enter") {
        const text = keyboard.value;
        keyboard.value = "";
        debug('mainInput: send "' + text + '"');
        callback(text);
      }
    });
  }
};

// To screen
const sink = {
  send: function(str) {
    const screen = document.getElementById("screen");
    screen.innerHTML += "\n" + str;
  }
};

const stdin = new InputStream(source);
const stdout = new OutputStream(sink);

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
  p.start();

  return pid;
}

const pid = createProcess(stdin, stdout, async function(std) {
  // Shell
  std.print("RUNNING PROCESS: " + std.pid);
  let str = await std.read();
  let [cmd, ...args] = str.split(" ");

  while (cmd !== "quit") {
    std.test(cmd + ": " + args.join(","));

    // Spawn & Wait test
    // const pid2 = await spawn(async std2 => {
    //   std2.print("RUNNING CHILD PROCESS 2: " + std2.pid);
    //   return new Promise(resolve => {
    //     setTimeout(() => {
    //       std2.print("ENDING CHILD PROCESS 2");
    //       resolve();
    //     }, 1000);
    //   });
    // });
    // std.print("waiting for child");
    // await std.wait(pid2);
    // std.print("done waiting");

    // Spawn & Read test
    // const pid3 = await spawn(async std3 => {
    //   std3.print("RUNNING CHILD PROCESS 3: " + std3.pid);
    //   const char = await std3.read();
    //   std3.print("READ BY CHILD 3: " + char);
    // });
    //
    // await std.wait(pid2);

    let str = await std.read();
    [cmd, ...args] = str.split(" ");
  }
});

// const stdin = new InputStream(source);
// const stdin2 = new InputStream();
// const stdout = new OutputStream(stdin2);
// const stdout2 = new OutputStream(sink);
//
// const main = new Process(stdin, stdout, async function() {
//   const str = await read();
//   console.log('process 1: read "' + str + '"');
//   return new Promise(resolve => {
//     setTimeout(() => {
//       print(str);
//       resolve();
//     }, 1000);
//   });
// });
//
// const second = new Process(stdin2, stdout2, async function() {
//   const str = await read();
//   console.log('process 2: read "' + str + '"');
//   print(str);
// });
//
// main.start();
// second.start();
