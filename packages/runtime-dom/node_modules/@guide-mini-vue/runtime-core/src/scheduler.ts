const queue: any[] = []; // 组件更新队列
const activePreFlushCbs: any[] = []; // watchEffect 的 fn 队列
let isFlushPending = false;

export function queueJobs(job) {
  if (!queue.includes(job)) {
    queue.push(job);
  }

  queueFlush();
}

export function nextTick(fn?) {
  const P = Promise.resolve();
  return fn ? P.then(fn) : P;
}

export function queuePreFlushCbs(job) {
  activePreFlushCbs.push(job);

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

  flushPreFlushCbs();

  // 组件渲染时执行
  let job;
  while ((job = queue.shift())) {
    job();
  }
}

function flushPreFlushCbs() {
  for (let i = 0; i < activePreFlushCbs.length; i++) {
    activePreFlushCbs[i]();
  }
}
