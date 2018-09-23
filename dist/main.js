/*
TODO:
  - Add return values to processes
*/
// From keyboard
const source = {
  recieve: function(callback) {
    const keyboard = document.getElementById("keyboard");
    if (!keyboard || !(keyboard instanceof HTMLInputElement)) return;

    keyboard.addEventListener("keypress", event => {
      jsh.debug("mainInput: press " + event.key);

      if (event.key === "Enter") {
        const text = keyboard.value;
        keyboard.value = "";
        jsh.debug('mainInput: send "' + text + '"');
        callback(text);
      }
    });
  }
};

// To screen
const sink = {
  send: function(str) {
    const screen = document.getElementById("screen");
    if (!screen || !(screen instanceof HTMLTextAreaElement)) return;

    screen.innerHTML += "\n" + str;
  }
};

const stdin = new jsh.InputStream(source);
const stdout = new jsh.OutputStream(sink);

const fileSystem = {
  "~": {
    type: "DIR",
    contents: {
      a: {
        type: "DIR",
        contents: {
          b: {
            type: "DIR",
            contents: {}
          }
        }
      }
    }
  }
};
let currPath = ["~"];
const globals = {
  cd: function(path) {
    if (!path) {
      currPath = ["~"];
      return "Current path: ~";
    }

    const tempPath = currPath.concat(path.split("/"));
    let realPath = [];
    let skipCount = 0;
    for (let i = tempPath.length - 1; i >= 0; i--) {
      if (tempPath[i] === "..") {
        skipCount++;
      } else if (tempPath[i] !== ".") {
        if (skipCount > 0) {
          skipCount--;
        } else {
          realPath.unshift(tempPath[i]);
        }
      }
    }

    if (skipCount > 0) return "Cannot go higher than ~";

    let curr = fileSystem["~"];
    for (let i = 0; i < realPath.length; i++) {
      const p = realPath[i];
      if (p === "~" && i === 0) curr = fileSystem["~"];
      else if (!curr.contents[p]) return "Path does not exist";
      else curr = curr.contents[p];
    }

    currPath = realPath;
    return "Current path: " + currPath.join("/");
  }
};

const pool = new jsh.ProcessPool(globals);

const mainPID = pool.createProcess(stdin, stdout, async function(std) {
  std.print("Hello world! Welcome to jsh.");

  let str = await std.read();
  let [cmd, ...args] = str.split(" ");

  while (cmd !== "quit") {
    if (!std[cmd]) {
      std.print("Unknown command: " + cmd);
    } else if (cmd !== "") {
      const ret = await std[cmd](...args);
      if (ret) {
        std.print(ret);
      }
    }

    let str = await std.read();
    [cmd, ...args] = str.split(" ");
  }
});

pool.startProcess(mainPID);
