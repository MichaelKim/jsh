const ProcessPool = require("../src/process");
const { InputStream, OutputStream, debug } = require("../src/stdio");

require("./workerStub");

describe("sanity", () => {
  it("2 + 2 = 4", () => {
    expect(2 + 2).toBe(4);
  });
});

describe("InputStream", () => {
  it("send + read", async () => {
    const stdin = new InputStream();

    stdin.send("hello");
    const char = await stdin.read();

    expect(char).toBe("hello");
  });

  it("using source", () => {
    const source = {
      recieve: jest.fn()
    };
    const stdin = new InputStream(source);

    expect(source.recieve).toBeCalledTimes(1);
    expect(source.recieve).toBeCalledWith(expect.any(Function));
  });
});

describe("OutputStream", () => {
  it("print", () => {
    const sink = {
      send: jest.fn()
    };

    const stdout = new OutputStream(sink);
    expect(sink.send).not.toBeCalled();

    stdout.print("bye");

    expect(sink.send).toBeCalledTimes(1);
    expect(sink.send).toBeCalledWith("bye");
  });
});

describe("ProcessPool", () => {
  let source;
  let sink;

  beforeEach(() => {
    source = {
      recieve: jest.fn(send => send("hello world"))
    };
    sink = {
      send: jest.fn()
    };
  });

  it("process output", async () => {
    const pool = new ProcessPool();
    const stdin = new InputStream();
    const stdout = new OutputStream(sink);

    const pid = pool.createProcess(stdin, stdout, async std => {
      std.print("I am in a process");
    });

    pool.startProcess(pid);
    await pool.waitProcess(pid);

    expect(sink.send.mock.calls).toEqual([["I am in a process"]]);
  });

  it("process input + output", async () => {
    const pool = new ProcessPool();
    const stdin = new InputStream(source);
    const stdout = new OutputStream(sink);

    const pid = pool.createProcess(stdin, stdout, async std => {
      const char = await std.read();
      std.print(char);
    });

    pool.startProcess(pid);
    await pool.waitProcess(pid);

    expect(source.recieve).toBeCalledTimes(1);
    expect(sink.send.mock.calls).toEqual([["hello world"]]);
  });

  it("spawn process", async () => {
    const pool = new ProcessPool();
    const stdin = new InputStream();
    const stdout = new OutputStream(sink);

    const pid = pool.createProcess(stdin, stdout, async std => {
      const pid2 = await std.spawn(async std2 => {
        std2.print("boo");
        return new Promise(resolve => {
          setTimeout(() => {
            std2.print("end");
            resolve();
          }, 100);
        });
      });

      std.start(pid2);
      await std.wait(pid2);
      std.print("done");
    });

    pool.startProcess(pid);
    await pool.waitProcess(pid);

    expect(sink.send.mock.calls).toEqual([["boo"], ["end"], ["done"]]);
  });

  it("spawn + read", async () => {
    const pool = new ProcessPool();
    const stdin = new InputStream(source);
    const stdout = new OutputStream(sink);

    const pid = pool.createProcess(stdin, stdout, async std => {
      const pid3 = await std.spawn(async std3 => {
        std3.print("foo");
        const line = await std3.read();
        std3.print(line);
      });

      std.start(pid3);
      await std.wait(pid3);
      std.print("done");
    });

    pool.startProcess(pid);
    await pool.waitProcess(pid);

    expect(sink.send.mock.calls).toEqual([["foo"], ["hello world"], ["done"]]);
  });

  it("i/o redirection", async () => {
    const pool = new ProcessPool();
    const stdin = new InputStream(source);
    const stdout = new OutputStream(sink);

    global.test = jest.fn();

    const pid = pool.createProcess(stdin, stdout, async std => {
      const childSource = {
        recieve: function(callback) {
          callback("my input");
        }
      };

      const childSink = {
        send: function(str) {
          global.test(str);
        }
      };

      const pid4 = await std.spawn(
        async std4 => {
          const line = await std4.read();
          std4.print(line);
        },
        childSource,
        childSink
      );

      std.start(pid4);
      await std.wait(pid4);
    });

    pool.startProcess(pid);
    await pool.waitProcess(pid);

    expect(global.test.mock.calls).toEqual([["my input"]]);
  });

  it("piping", async () => {
    const pool = new ProcessPool();
    const stdin = new InputStream(source);
    const stdout = new OutputStream(sink);

    const pid = pool.createProcess(stdin, stdout, async std => {
      const pids = await std.spawnMultiple(
        async std5 => {
          const char5 = await std5.read();
          std5.print("5" + char5);
        },
        async std6 => {
          const char6 = await std6.read();
          std6.print("6" + char6);
        },
        async std7 => {
          const char7 = await std7.read();
          std7.print("7" + char7);
        }
      );

      for (let i = 0; i < pids.length; i++) {
        std.start(pids[i]);
        await std.wait(pids[i]);
      }
    });

    pool.startProcess(pid);
    await pool.waitProcess(pid);

    expect(sink.send.mock.calls).toEqual([["765hello world"]]);
  });

  it("custom global function", async () => {
    const testFn = jest.fn(str => str + "!");
    const pool = new ProcessPool({
      test: function(str) {
        return new Promise(resolve => {
          setTimeout(() => resolve(testFn(str)), 100);
        });
      }
    });
    const stdin = new InputStream(source);
    const stdout = new OutputStream(sink);

    const pid = pool.createProcess(stdin, stdout, async std => {
      const val = await std.test("hello world");
      std.print(val);
    });

    pool.startProcess(pid);
    await pool.waitProcess(pid);

    expect(testFn.mock.calls).toEqual([["hello world"]]);
    expect(sink.send.mock.calls).toEqual([["hello world!"]]);
  });
});
