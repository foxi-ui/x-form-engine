import { createEventBus } from './event-bus';

test('on 返回 unsubscribe，emit 同步触发，销毁后不再触发', () => {
  const bus = createEventBus();
  const calls: number[] = [];
  const off = bus.on<number>('plugin:install', (p) => calls.push(p));
  bus.emit('plugin:install', 1);
  off();
  bus.emit('plugin:install', 2);
  expect(calls).toEqual([1]);
});

test('once 只触发一次，多个订阅互不影响', () => {
  const bus = createEventBus();
  const onceCalls: number[] = [];
  const onCalls: number[] = [];
  bus.once<number>('submit', (p) => onceCalls.push(p));
  bus.on<number>('submit', (p) => onCalls.push(p));

  bus.emit('submit', 1);
  bus.emit('submit', 2);

  expect(onceCalls).toEqual([1]);
  expect(onCalls).toEqual([1, 2]);
});

test('退订函数幂等，退订后对应监听器被清理', () => {
  const bus = createEventBus();
  const calls: number[] = [];
  const off = bus.on<number>('renderer:mount', (p) => calls.push(p));
  off();
  off();
  bus.emit('renderer:mount', 1);
  expect(calls).toEqual([]);
});

test('once 在监听器重入 emit 同事件时只触发一次', () => {
  const bus = createEventBus();
  const onceCalls: number[] = [];
  let normalCalls = 0;

  bus.on<number>('submit', () => {
    normalCalls += 1;
    if (normalCalls === 1) {
      bus.emit('submit', 99);
    }
  });
  bus.once<number>('submit', (p) => onceCalls.push(p));

  bus.emit('submit', 1);

  expect(normalCalls).toBe(2);
  expect(onceCalls).toEqual([99]);
});
