// @flow

import type {
  Source,
  Sink,
  InputStream as IS,
  OutputStream as OS
} from "./types";

function debug(test: string): void {
  console.log("FROM MAIN:", test);
}

function InputStream(source?: Source): IS {
  let _buffer: Array<string> = [];
  let _readCallback: ?(Promise<string> | string) => void = null;
  if (source && source.recieve) source.recieve(send);

  function read() {
    return new Promise<string>(resolve => {
      if (_buffer.length > 0) {
        debug("inputstream: read from buffer");
        const str = _buffer.shift();
        resolve(str);
      } else {
        debug("inputstream: waiting read from callback");
        _readCallback = resolve;
      }
    });
  }

  function send(str: string) {
    debug('inputstream: received "' + str + '"');
    if (_readCallback) {
      _readCallback(str);
      _readCallback = null;
      debug("inputstream: send to callback");
    } else {
      debug("inputstream: save to buffer");
      _buffer.push(str);
    }
  }

  return Object.freeze({ read, send });
}

function OutputStream(sink: Sink): OS {
  function print(str: string) {
    sink.send(str);
  }

  return Object.freeze({
    print
  });
}

module.exports = {
  debug,
  InputStream,
  OutputStream
};
