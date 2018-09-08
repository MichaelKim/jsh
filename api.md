Process Web Worker API:

- To WW
  - START, cmd, args, ...data
    - starts the web worker, providing it with data
  - INPUT, ...data
    - sends input to the web worker
- From WW
  - OUTPUT, ...data
    - output data to stdout
  - RETURN, ...data
    - terminate web worker, return data to callback
