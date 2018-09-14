function debug(test) {
  console.log("FROM MAIN:", test);
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
