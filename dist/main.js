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

const pool = new jsh.ProcessPool();
const mainPID = pool.createProcess(stdin, stdout, async function(std) {
  // Shell
  std.print("RUNNING PROCESS: " + std.pid);
  let str = await std.read();
  let [cmd, ...args] = str.split(" ");

  while (cmd !== "quit") {
    std.print(cmd + ": " + args.join(","));

    // Spawn & Wait test
    // const pid2 = await std.spawn(async std2 => {
    //   std2.print("RUNNING CHILD PROCESS 2: " + std2.pid);
    //   return new Promise(resolve => {
    //     setTimeout(() => {
    //       std2.print("ENDING CHILD PROCESS 2");
    //       resolve();
    //     }, 1000);
    //   });
    // });
    // std.start(pid2);
    // std.print("waiting for child");
    // await std.wait(pid2);
    // std.print("done waiting");

    // Spawn & Read test
    // const pid3 = await std.spawn(async std3 => {
    //   std3.print("RUNNING CHILD PROCESS 3: " + std3.pid);
    //   const char = await std3.read();
    //   std3.print("READ BY CHILD 3: " + char);
    // });
    //
    // std.start(pid3);
    // await std.wait(pid3);

    // I/O Redirection test
    // const childSource = {
    //   recieve: function(callback) {
    //     const keyboard = document.getElementById("keyboard2");
    //     if (!keyboard || !(keyboard instanceof HTMLInputElement)) return;
    //     keyboard.addEventListener("keypress", (event: KeyboardEvent) => {
    //       debug("mainInput: press " + event.key);
    //
    //       if (event.key === "Enter") {
    //         const text = keyboard.value;
    //         keyboard.value = "";
    //         debug('mainInput: send "' + text + '"');
    //         callback(text);
    //       }
    //     });
    //   }
    // };
    //
    // const childSink = {
    //   send: function(str) {
    //     const screen = document.getElementById("screen");
    //     if (!screen || !(screen instanceof HTMLTextAreaElement)) return;
    //     screen.innerHTML += "\n" + "OVERRIDDEN: " + str;
    //   }
    // };
    //
    // const pid4 = await std.spawn(
    //   async std4 => {
    //     const char4 = await std4.read();
    //     std4.print("RUNNING CHILD PROCESS 4: " + std4.pid + " " + char4);
    //   },
    //   childSource,
    //   childSink
    // );
    //
    // std.start(pid4);
    //
    // await std.wait(pid4);

    // Piping test
    const pids = await std.spawnMultiple(
      async std5 => {
        const char5 = await std5.read();
        std5.print("RUNNING CHILD PROCESS 5: " + std5.pid + " " + char5);
      },
      async std6 => {
        const char6 = await std6.read();
        std6.print("RUNNING CHILD PROCESS 6: " + std6.pid + " " + char6);
      },
      async std7 => {
        const char7 = await std7.read();
        std7.print("RUNNING CHILD PROCESS 7: " + std7.pid + " " + char7);
      }
    );

    for (let i = 0; i < pids.length; i++) {
      std.start(pids[i]);
      debug("STARTED " + pids[i]);
      await std.wait(pids[i]);
      debug("FINISHED " + pids[i]);
    }

    let str = await std.read();
    [cmd, ...args] = str.split(" ");
  }
});

pool.startProcess(mainPID);
