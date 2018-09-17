// @flow

export type Source = {|
  +recieve?: ((str: string) => void) => void
|};

// Inexact because InputStream is a Sink
export type Sink = {
  +send: (str: string) => void
};

export type InputStream = {|
  +read: () => Promise<string>,
  +send: (str: string) => void
|};

export type OutputStream = {|
  +print: (str: string) => void
|};

export type ProcessBody = ((std: StdLib) => Promise<void>);

export type ProcessPoolType = {|
  +createProcess: (
    stdin: InputStream,
    stdout: OutputStream,
    body: ProcessBody
  ) => PID,
  +startProcess: (pid: PID) => void,
  +waitProcess: (pid: PID) => Promise<void>
|};

export type ProcessType = {|
  +start: () => void,
  +onFinish: (callback: Function) => void
|};

export type PID = number;

export type StdLib = {|
  +pid: PID,
  +read: () => Promise<string>,
  +print: (str: string) => void,
  +test: (str: string) => void,
  +spawn: (
    body: (std: StdLib) => Promise<void>,
    source?: Source,
    sink?: Sink
  ) => Promise<PID>,
  +spawnMultiple: (
    ...bodies: Array<(std: StdLib) => Promise<void>>
  ) => Promise<Array<PID>>,
  +wait: (pid: PID) => Promise<void>,
  +start: (pid: PID) => void
|};

export type ProcessMessageData =
  | {|
      +type: "READ"
    |}
  | {|
      +type: "PRINT",
      +value: string
    |}
  | {|
      +type: "SPAWN",
      +body: string,
      +source?: string,
      +sink?: string
    |}
  | {|
      +type: "SPAWN_MULTIPLE",
      +bodies: string
    |}
  | {|
      +type: "WAIT",
      +value: PID
    |}
  | {|
      +type: "START_OTHER",
      +value: PID
    |}
  | {| +type: "FINISH" |};
