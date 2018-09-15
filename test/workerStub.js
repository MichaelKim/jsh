global.URL = {
  // Store worker code
  __WORKERS: {},
  // Blob URL is same as worker id for simplicity
  createObjectURL: function(blob) {
    let id = (Math.random() * 1000) | 0;
    while (this.__WORKERS[id]) {
      id = (Math.random() * 1000) | 0;
    }
    this.__WORKERS[id] = blob;
    return id;
  },
  revokeObjectURL: function(blobURL) {
    delete this.__WORKERS[blobURL];
  }
};

global.Worker = function Worker(blobUrl) {
  // Messages dispatched before worker is created
  let earlyMessages = [];
  const toWorker = new Stream();
  const toBrowser = new Stream();

  // Browser-side methods
  toBrowser.on("message", e => {
    this.onmessage && this.onmessage(e);
  });
  this.addEventListener = toBrowser.on;
  this.postMessage = data => {
    if (earlyMessages) earlyMessages.push(data);
    else toWorker.emit("message", { data });
  };
  this.terminate = () => {
    toWorker.stop();
    toBrowser.stop();
  };

  // Convert blob into string (worker code)
  const fr = new FileReader();
  fr.onload = () => {
    const code = fr.result;

    // Worker-side methods
    const workerMethods = {
      onmessage: () => {},
      addEventListener: toWorker.on,
      postMessage: data => {
        toBrowser.emit("message", { data });
      }
    };

    const vars = Object.keys(workerMethods)
      .map(k => `var ${k}=this.${k};`)
      .join("");
    const getWorkerVar = new Function(`
        ${vars}
        ${code}
        return eval;
    `).call(workerMethods);
    const workerOnMessage = getWorkerVar("onmessage");

    // Worker onmessage
    toWorker.on("message", e => {
      if (workerOnMessage) workerOnMessage.call(workerMethods, e);
    });

    // Send early messages
    const temp = earlyMessages;
    earlyMessages = null;
    temp.forEach(this.postMessage);
  };
  fr.onerror = () => {
    throw "Could not create worker: " + fr.error;
  };
  fr.readAsText(global.URL.__WORKERS[blobUrl]);

  // Streams for postMessage
  function Stream() {
    let cbs = [];
    this.on = (type, callback) => {
      if (type === "message") cbs.push(callback);
    };
    this.emit = (type, data) => {
      if (type === "message") cbs.forEach(cb => cb(data));
    };
    this.stop = () => {
      cb = [];
    };
  }
};
