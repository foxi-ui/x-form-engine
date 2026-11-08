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

test('监听器抛错不中断派发，也不向 emit 抛出', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const bus = createEventBus();
  const calls: number[] = [];
  bus.on<number>('submit', () => { calls.push(1); throw new Error('boom'); });
  bus.on<number>('submit', (p) => calls.push(p));
  expect(() => bus.emit('submit', 2)).not.toThrow();
  expect(calls).toEqual([1, 2]);
  expect(spy).toHaveBeenCalledTimes(1);
  spy.mockRestore();
});

test('once 监听器抛错后仍被退订', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const bus = createEventBus();
  const calls: number[] = [];
  bus.once<number>('submit', () => { calls.push(1); throw new Error('boom'); });
  expect(() => bus.emit('submit', 1)).not.toThrow();
  bus.emit('submit', 2);
  expect(calls).toEqual([1]);
  spy.mockRestore();
});
