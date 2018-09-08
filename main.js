const global = {
  echo: function(cmd, args) {
    output.print(args);
    postMessage({ type: "RETURN" });
  },
  sleep: function(cmd, args) {
    setTimeout(() => {
      close();
    }, parseInt(args) || 0);
  },
  cat: function(cmd, args) {
    input(text => {
      output.print(text);
      close();
    });
  }
};

function Process(input, output, cmd, args, callback) {
  // Invalid command
  if (!global[cmd]) {
    output.print("Unknown command: " + cmd);
    return null;
  }

  const blob = new Blob([
    `
    let inputCallback;
    let inputBuffer = '';
    onmessage = e => {
      if (e.data.type === "START") {
        (${global[cmd].toString()})(e.data.cmd, e.data.args);
      } else if (e.data.type === "INPUT") {
        if (inputCallback) {
          inputCallback(e.data.value);
          inputCallback = null;
        }
        else {
          inputBuffer += '\\n' + e.data.value;
        }
      }
    };
    const input = function(callback) {
      if (inputBuffer) {
        const temp = inputBuffer;
        inputBuffer = '';
        callback(temp);
      } else {
        inputCallback = function(text) {
          callback(text);
        }
      }
    }
    const output = {
      print: function(...text) {
        postMessage({ type: "OUTPUT", value: text });
      }
    };
    function close() {
      postMessage({ type: "RETURN" });
    }
  `
  ]);

  const blobURL = window.URL.createObjectURL(blob);
  const worker = new Worker(blobURL);
  let inputID;

  worker.onmessage = e => {
    if (e.data.type === "RETURN") {
      callback(e.data.value);
      this.close();
    } else if (e.data.type === "OUTPUT") {
      output.print(e.data.value);
    }
  };

  this.start = () => {
    output.print("process started");
    console.log("started");
    worker.postMessage({ type: "START", cmd, args });
    inputID = input.onEnter(text => {
      worker.postMessage({ type: "INPUT", value: text });
    });
  };

  this.close = () => {
    window.URL.revokeObjectURL(blobURL);
    worker.terminate();
    input.cancel(inputID);
  };
}

stdin.onEnter(text => {
  const [cmd, ...args] = text.split(" ");

  const process = new Process(stdin, stdout, cmd, args, returnVal => {
    stdout.print("process ended", returnVal);
  });

  if (process.start) {
    process.start();
  }
});
