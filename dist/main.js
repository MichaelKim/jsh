/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/index.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/index.js":
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("const ProcessPool = __webpack_require__(/*! ./process */ \"./src/process.js\");\n\nconst {\n  InputStream,\n  OutputStream,\n  debug\n} = __webpack_require__(/*! ./stdio */ \"./src/stdio.js\");\n\n// From keyboard\nconst source = {\n  recieve: function (callback) {\n    const keyboard = document.getElementById(\"keyboard\");\n    if (!keyboard || !(keyboard instanceof HTMLInputElement)) return;\n    keyboard.addEventListener(\"keypress\", event => {\n      debug(\"mainInput: press \" + event.key);\n\n      if (event.key === \"Enter\") {\n        const text = keyboard.value;\n        keyboard.value = \"\";\n        debug('mainInput: send \"' + text + '\"');\n        callback(text);\n      }\n    });\n  }\n}; // To screen\n\nconst sink = {\n  send: function (str) {\n    const screen = document.getElementById(\"screen\");\n    if (!screen || !(screen instanceof HTMLTextAreaElement)) return;\n    screen.innerHTML += \"\\n\" + str;\n  }\n};\nconst stdin = new InputStream(source);\nconst stdout = new OutputStream(sink);\nconst pool = new ProcessPool();\nconst mainPID = pool.createProcess(stdin, stdout, async function (std) {\n  // Shell\n  std.print(\"RUNNING PROCESS: \" + std.pid);\n  let str = await std.read();\n  let [cmd, ...args] = str.split(\" \");\n\n  while (cmd !== \"quit\") {\n    std.test(cmd + \": \" + args.join(\",\")); // Spawn & Wait test\n    // const pid2 = await std.spawn(async std2 => {\n    //   std2.print(\"RUNNING CHILD PROCESS 2: \" + std2.pid);\n    //   return new Promise(resolve => {\n    //     setTimeout(() => {\n    //       std2.print(\"ENDING CHILD PROCESS 2\");\n    //       resolve();\n    //     }, 1000);\n    //   });\n    // });\n    // std.start(pid2);\n    // std.print(\"waiting for child\");\n    // await std.wait(pid2);\n    // std.print(\"done waiting\");\n    // Spawn & Read test\n    // const pid3 = await std.spawn(async std3 => {\n    //   std3.print(\"RUNNING CHILD PROCESS 3: \" + std3.pid);\n    //   const char = await std3.read();\n    //   std3.print(\"READ BY CHILD 3: \" + char);\n    // });\n    //\n    // std.start(pid3);\n    // await std.wait(pid3);\n    // I/O Redirection test\n    // const childSource = {\n    //   recieve: function(callback) {\n    //     const keyboard = document.getElementById(\"keyboard2\");\n    //     if (!keyboard || !(keyboard instanceof HTMLInputElement)) return;\n    //     keyboard.addEventListener(\"keypress\", (event: KeyboardEvent) => {\n    //       debug(\"mainInput: press \" + event.key);\n    //\n    //       if (event.key === \"Enter\") {\n    //         const text = keyboard.value;\n    //         keyboard.value = \"\";\n    //         debug('mainInput: send \"' + text + '\"');\n    //         callback(text);\n    //       }\n    //     });\n    //   }\n    // };\n    //\n    // const childSink = {\n    //   send: function(str) {\n    //     const screen = document.getElementById(\"screen\");\n    //     if (!screen || !(screen instanceof HTMLTextAreaElement)) return;\n    //     screen.innerHTML += \"\\n\" + \"OVERRIDDEN: \" + str;\n    //   }\n    // };\n    //\n    // const pid4 = await std.spawn(\n    //   async std4 => {\n    //     const char4 = await std4.read();\n    //     std4.print(\"RUNNING CHILD PROCESS 4: \" + std4.pid + \" \" + char4);\n    //   },\n    //   childSource,\n    //   childSink\n    // );\n    //\n    // std.start(pid4);\n    //\n    // await std.wait(pid4);\n    // Piping test\n\n    const pids = await std.spawnMultiple(async std5 => {\n      const char5 = await std5.read();\n      std5.print(\"RUNNING CHILD PROCESS 5: \" + std5.pid + \" \" + char5);\n    }, async std6 => {\n      const char6 = await std6.read();\n      std6.print(\"RUNNING CHILD PROCESS 6: \" + std6.pid + \" \" + char6);\n    }, async std7 => {\n      const char7 = await std7.read();\n      std7.print(\"RUNNING CHILD PROCESS 7: \" + std7.pid + \" \" + char7);\n    });\n\n    for (let i = 0; i < pids.length; i++) {\n      std.start(pids[i]);\n      debug(\"STARTED \" + pids[i]);\n      await std.wait(pids[i]);\n      debug(\"FINISHED \" + pids[i]);\n    }\n\n    let str = await std.read();\n    [cmd, ...args] = str.split(\" \");\n  }\n});\npool.startProcess(mainPID);\n\n//# sourceURL=webpack:///./src/index.js?");

/***/ }),

/***/ "./src/process.js":
/*!************************!*\
  !*** ./src/process.js ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }\n\nfunction _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }\n\nconst {\n  InputStream,\n  OutputStream,\n  debug\n} = __webpack_require__(/*! ./stdio */ \"./src/stdio.js\");\n\nconst workerFile = __webpack_require__(/*! ./worker */ \"./src/worker.js\");\n\nfunction ProcessPool() {\n  const _processList = {};\n\n  function Process(pid, stdin, stdout, body) {\n    let _finishCallback = null;\n    const blob = new Blob([generateWebWorkerCode(pid, body)]);\n    const blobURL = window.URL.createObjectURL(blob);\n    const worker = new Worker(blobURL);\n\n    worker.onmessage = async e => {\n      const data = e.data;\n\n      if (data.type === \"READ\") {\n        debug(\"await reading\");\n        const text = await stdin.read();\n        worker.postMessage({\n          type: \"READ_RETURN\",\n          value: text\n        });\n      } else if (data.type === \"PRINT\") {\n        const text = data.value;\n        debug(\"GOT PRINT: \" + text);\n        stdout.print(text);\n      } else if (data.type === \"SPAWN\") {\n        const childBody = data.body;\n        const childSource = data.source;\n        const childSink = data.sink;\n        let childStdin = stdin;\n\n        if (childSource) {\n          childStdin = new InputStream(deserialize(childSource));\n        }\n\n        let childStdout = stdout;\n\n        if (childSink) {\n          childStdout = new OutputStream(deserialize(childSink));\n        }\n\n        const childPid = createProcess(childStdin, childStdout, childBody);\n        debug(\"created child process: \" + childPid);\n        worker.postMessage({\n          type: \"SPAWN_RETURN\",\n          value: childPid\n        });\n      } else if (data.type === \"SPAWN_MULTIPLE\") {\n        const bodies = data.bodies.split(\"@@@\");\n        let pids = [];\n        let childSink = stdin;\n\n        for (let i = bodies.length - 1; i >= 0; i--) {\n          const childBody = bodies[i];\n          const childStdin = i === 0 ? stdin : new InputStream();\n          const childStdout = i === bodies.length - 1 ? stdout : new OutputStream(childSink);\n          const childPid = createProcess(childStdin, childStdout, childBody);\n          pids.unshift(childPid);\n          childSink = childStdin;\n        }\n\n        worker.postMessage({\n          type: \"SPAWN_MULTIPLE_RETURN\",\n          value: pids\n        });\n      } else if (data.type === \"WAIT\") {\n        const pid = data.value;\n\n        if (_processList[pid]) {\n          _processList[pid].finishCallbacks.push(() => worker.postMessage({\n            type: \"WAIT_RETURN\"\n          }));\n        }\n      } else if (data.type === \"START_OTHER\") {\n        const pid = data.value;\n        debug(\"STARTING PROCESS \" + pid);\n        startProcess(pid);\n      } else if (data.type === \"FINISH\") {\n        close();\n      }\n    };\n\n    function start() {\n      worker.postMessage({\n        type: \"START\",\n        pid: pid,\n        body: body.toString()\n      });\n    }\n\n    function onFinish(callback) {\n      _finishCallback = callback;\n    }\n\n    function close() {\n      debug(\"closing \" + pid);\n      window.URL.revokeObjectURL(blobURL);\n      worker.terminate();\n      if (_finishCallback) _finishCallback();\n    }\n\n    return {\n      start,\n      onFinish\n    };\n  }\n\n  function createProcess(stdin, stdout, body) {\n    const pid = _generateNewPID();\n\n    const process = new Process(pid, stdin, stdout, body);\n    _processList[pid] = {\n      process: process,\n      finishCallbacks: []\n    };\n    process.onFinish(() => {\n      debug(\"running callbacks for \" + pid);\n\n      _processList[pid].finishCallbacks.forEach(cb => cb());\n    });\n    return pid;\n  }\n\n  function startProcess(pid) {\n    if (_processList[pid]) {\n      _processList[pid].process.start();\n    }\n  }\n\n  async function waitProcess(pid) {\n    return new Promise(resolve => {\n      if (_processList[pid]) {\n        _processList[pid].process.onFinish(resolve);\n      }\n    });\n  }\n\n  function _generateNewPID() {\n    let pid = Math.random() * 1000 | 0;\n\n    while (_processList[pid]) {\n      pid = Math.random() * 1000 | 0;\n    }\n\n    return pid;\n  }\n\n  return Object.freeze({\n    createProcess,\n    startProcess,\n    waitProcess\n  });\n}\n\nfunction deserialize(str) {\n  const parsed = JSON.parse(str);\n  return Object.keys(parsed).reduce((acc, key) => _objectSpread({}, acc, {\n    [key]: eval(\"(\" + parsed[key] + \")\")\n  }), {});\n}\n\nfunction generateWebWorkerCode(pid, body) {\n  return `(${workerFile})(${pid}, String(${body.toString()}))`;\n}\n\nmodule.exports = ProcessPool;\n\n//# sourceURL=webpack:///./src/process.js?");

/***/ }),

/***/ "./src/stdio.js":
/*!**********************!*\
  !*** ./src/stdio.js ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("function debug(test) {\n  console.log(\"FROM MAIN:\", test);\n}\n\nfunction InputStream(source) {\n  let _buffer = [];\n  let _readCallback = null;\n  if (source && source.recieve) source.recieve(send);\n\n  function read() {\n    return new Promise(resolve => {\n      if (_buffer.length > 0) {\n        debug(\"inputstream: read from buffer\");\n\n        const str = _buffer.shift();\n\n        resolve(str);\n      } else {\n        debug(\"inputstream: waiting read from callback\");\n        _readCallback = resolve;\n      }\n    });\n  }\n\n  function send(str) {\n    debug('inputstream: received \"' + str + '\"');\n\n    if (_readCallback) {\n      _readCallback(str);\n\n      _readCallback = null;\n      debug(\"inputstream: send to callback\");\n    } else {\n      debug(\"inputstream: save to buffer\");\n\n      _buffer.push(str);\n    }\n  }\n\n  return Object.freeze({\n    read,\n    send\n  });\n}\n\nfunction OutputStream(sink) {\n  function print(str) {\n    sink.send(str);\n  }\n\n  return Object.freeze({\n    print\n  });\n}\n\nmodule.exports = {\n  debug,\n  InputStream,\n  OutputStream\n};\n\n//# sourceURL=webpack:///./src/stdio.js?");

/***/ }),

/***/ "./src/worker.js":
/*!***********************!*\
  !*** ./src/worker.js ***!
  \***********************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("module.exports = String( // Start of web worker code\n(_pid, _body) => {\n  // let postMessage: (data: any) => void;\n  // let addEventListener: (\n  //   type: string,\n  //   callback: (e: MessageEvent) => void | Promise<void>\n  // ) => void = (a) => {};\n  function debug(test) {\n    console.log(\"FROM \" + _pid + \":\", test);\n  }\n\n  function InputStream(source) {\n    let buffer = [];\n    let readCallback = null;\n\n    this.read = function () {\n      return new Promise(resolve => {\n        if (buffer.length > 0) {\n          debug(\"inputstream: read from buffer\");\n          const str = buffer.shift();\n          resolve(str);\n        } else {\n          debug(\"inputstream: waiting read from callback\");\n          postMessage({\n            type: \"READ\"\n          });\n          readCallback = resolve;\n        }\n      });\n    };\n\n    this.send = function (str) {\n      debug('inputstream: received \"' + str + '\"');\n\n      if (readCallback) {\n        debug(\"inputstream: send to callback\");\n        readCallback(str);\n        readCallback = null;\n      } else {\n        debug(\"inputstream: save to buffer\");\n        buffer.push(str);\n      }\n    };\n\n    if (source) source.recieve(this.send);\n  }\n\n  function OutputStream(sink) {\n    this.print = function (str) {\n      sink.send(str);\n    };\n  }\n\n  const stdin = new InputStream({\n    recieve: function (callback) {\n      addEventListener(\"message\", e => {\n        if (e.data.type === \"READ_RETURN\") {\n          const str = e.data.value;\n          callback(str);\n        }\n      });\n    }\n  });\n  const stdout = new OutputStream({\n    send: function (str) {\n      debug(\"PRINTING \" + str);\n      postMessage({\n        type: \"PRINT\",\n        value: str\n      });\n    }\n  });\n  let spawnCallback = null;\n\n  async function spawn(body, source, sink) {\n    return new Promise(resolve => {\n      spawnCallback = resolve;\n      postMessage({\n        type: \"SPAWN\",\n        body: body.toString(),\n        source: source ? serialize(source) : null,\n        sink: sink ? serialize(sink) : null\n      });\n    });\n  }\n\n  let waitCallback = null;\n\n  async function wait(pid) {\n    return new Promise(resolve => {\n      waitCallback = resolve;\n      postMessage({\n        type: \"WAIT\",\n        value: pid\n      });\n    });\n  }\n\n  let spawnMultipleCallback = null;\n\n  function spawnMultiple(...bodies) {\n    return new Promise(resolve => {\n      spawnMultipleCallback = resolve;\n      postMessage({\n        type: \"SPAWN_MULTIPLE\",\n        bodies: bodies.join(\"@@@\")\n      });\n    });\n  }\n\n  function start(pid) {\n    postMessage({\n      type: \"START_OTHER\",\n      value: pid\n    });\n  }\n\n  function serialize(obj) {\n    return JSON.stringify(Object.keys(obj).reduce((acc, key) => Object.assign(acc, {\n      [key]: obj[key].toString()\n    }), {}));\n  }\n\n  addEventListener(\"message\", async e => {\n    if (e.data.type === \"START\") {\n      const body = eval(\"(\" + _body + \")\");\n      const std = {\n        pid: _pid,\n        read: stdin.read,\n        print: stdout.print,\n        test: function (str) {\n          stdout.print(\"TESTING GLOBAL: \" + str);\n        },\n        spawn: spawn,\n        wait: wait,\n        start: start,\n        spawnMultiple: spawnMultiple\n      };\n      await body(std);\n      postMessage({\n        type: \"FINISH\"\n      });\n    } else if (e.data.type === \"SPAWN_RETURN\") {\n      const pid = e.data.value;\n\n      if (spawnCallback) {\n        spawnCallback(pid);\n        spawnCallback = null;\n      }\n    } else if (e.data.type === \"SPAWN_MULTIPLE_RETURN\") {\n      const pids = e.data.value;\n\n      if (spawnMultipleCallback) {\n        spawnMultipleCallback(pids);\n        spawnMultipleCallback = null;\n      }\n    } else if (e.data.type === \"WAIT_RETURN\") {\n      if (waitCallback) {\n        waitCallback();\n        waitCallback = null;\n      }\n    }\n  });\n});\n\n//# sourceURL=webpack:///./src/worker.js?");

/***/ })

/******/ });