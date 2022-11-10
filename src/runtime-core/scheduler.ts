const queue: any[] = [];
let isFlushPending = false;

export function queueJobs(job) {
  if (!queue.includes(job)) {
    queue.push(job);
  }

  queueFlush();
}
function queueFlush() {
  // nextTick 只需要执行一次，统一执行所有 jobs
  if (isFlushPending) return;
  isFlushPending = true;

  nextTick(flushJobs);
}

function flushJobs() {
  console.log("flushJobs");
  isFlushPending = false;

  let job;
  while ((job = queue.shift())) {
    job();
  }
}

export function nextTick(fn) {
  const P = Promise.resolve();
  return fn ? P.then(fn) : P;
}
