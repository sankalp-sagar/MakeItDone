// src/index.ts

import { Supervisor } from "./supervisor/supervisor";

const supervisor = new Supervisor();

const task = supervisor.startTask(
  "Make a passport photo from this image"
);

console.log(task);