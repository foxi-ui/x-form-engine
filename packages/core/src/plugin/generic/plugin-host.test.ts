import { createGenericPluginHost } from './plugin-host';
import type {
  GenericPluginHostOptions,
  InstallablePlugin,
  PluginResourceRegistry,
} from './plugin-host';
import type { PluginLifecycleEvent } from '@x-form-engine/types';

class TestResourceRegistry implements PluginResourceRegistry {
  private map = new Map<string, { name: string; source?: string }>();
  register(name: string, source?: string) {
    this.map.set(name, { name, source });
  }
  list() {
    return [...this.map.values()];
  }
  unregister(name: string, source?: string) {
    const e = this.map.get(name);
    if (e && e.source === source) this.map.delete(name);
  }
}

interface TestContext {
  registry: TestResourceRegistry;
}

function makeHost() {
  const resources = [new TestResourceRegistry()];
  const host = createGenericPluginHost<InstallablePlugin<TestContext>, TestContext>({
    createContext: () => ({ registry: resources[0] }),
    resources,
  });
  return { host, resources };
}

/** 带生命周期事件收集的宿主，用于断言 `failed` / `disposed` 等事件。 */
function makeHostWithEvents() {
  const resources = [new TestResourceRegistry()];
  const events: PluginLifecycleEvent[] = [];
  const options: GenericPluginHostOptions<InstallablePlugin<TestContext>, TestContext> = {
    createContext: () => ({ registry: resources[0] }),
    resources,
    onEvent: (event) => events.push(event),
  };
  const host = createGenericPluginHost<
    InstallablePlugin<TestContext>,
    TestContext
  >(options);
  return { host, resources, events };
}

function makePlugin(
  overrides: Partial<InstallablePlugin<TestContext>> & { name: string }
): InstallablePlugin<TestContext> {
  return {
    version: '1.0.0',
    install: () => {},
    ...overrides,
  };
}

test('install 后 list/isInstalled 反映 active', () => {
  const { host } = makeHost();
  const p = makePlugin({ name: 'p' });

  host.install(p);

  expect(host.list()).toEqual([{ plugin: p, active: true }]);
  expect(host.isInstalled('p')).toBe(true);
});

test('install 调用 plugin.install 并传入 createContext 的上下文', () => {
  const { host, resources } = makeHost();
  let received: TestContext | undefined;
  const p = makePlugin({
    name: 'p',
    install: (context) => {
      received = context;
    },
  });

  host.install(p);

  expect(received).toBeDefined();
  expect(received!.registry).toBe(resources[0]);
});

test('重复 install 同名插件抛 PLUGIN_CONFLICT', () => {
  const { host } = makeHost();
  host.install(makePlugin({ name: 'p' }));

  expect(() => host.install(makePlugin({ name: 'p' }))).toThrowError(
    expect.objectContaining({ code: 'PLUGIN_CONFLICT' })
  );
});

test('依赖缺失抛 PLUGIN_DEPENDENCY_MISSING', () => {
  const { host } = makeHost();

  expect(() =>
    host.install(makePlugin({ name: 'a', dependencies: ['missing'] }))
  ).toThrowError(
    expect.objectContaining({ code: 'PLUGIN_DEPENDENCY_MISSING' })
  );
});

test('依赖拓扑：先装被依赖项 B 再装 A 成功；先装 A（依赖未装 B）抛依赖缺失', () => {
  const ok = makeHost();
  ok.host.install(makePlugin({ name: 'B' }));
  ok.host.install(makePlugin({ name: 'A', dependencies: ['B'] }));
  expect(ok.host.isInstalled('A')).toBe(true);
  expect(ok.host.isInstalled('B')).toBe(true);

  const bad = makeHost();
  expect(() =>
    bad.host.install(makePlugin({ name: 'A', dependencies: ['B'] }))
  ).toThrowError(
    expect.objectContaining({ code: 'PLUGIN_DEPENDENCY_MISSING' })
  );
});

test('install 中途抛错回滚已注册资源', () => {
  const { host, resources } = makeHost();
  const boom = makePlugin({
    name: 'boom',
    install: (context) => {
      context.registry.register('X', 'boom');
      throw new Error('install failed');
    },
  });

  expect(() => host.install(boom)).toThrowError('install failed');
  expect(resources[0].list().map((entry) => entry.name)).not.toContain('X');
  expect(host.isInstalled('boom')).toBe(false);
});

test('插件资源归属：unload 只释放自身资源', () => {
  const { host, resources } = makeHost();
  host.install(
    makePlugin({
      name: 'A',
      install: (context) => {
        context.registry.register('X', 'a');
      },
    })
  );
  host.install(
    makePlugin({
      name: 'B',
      install: (context) => {
        context.registry.register('Y', 'b');
      },
    })
  );

  host.uninstall('A');

  const names = resources[0].list().map((entry) => entry.name);
  expect(names).not.toContain('X');
  expect(names).toContain('Y');
});

test('install 返回的 teardown 在 unload 时调用', () => {
  const { host } = makeHost();
  let teardownCalled = false;
  host.install(
    makePlugin({
      name: 'A',
      install: () => () => {
        teardownCalled = true;
      },
    })
  );

  host.uninstall('A');

  expect(teardownCalled).toBe(true);
});

test('dispose 与 install 返回的 teardown 都调用且异常隔离', () => {
  // dispose 先于 teardown，两者都执行。
  const ordered = makeHost();
  const calls: string[] = [];
  ordered.host.install(
    makePlugin({
      name: 'A',
      dispose: () => {
        calls.push('dispose');
      },
      install: () => () => {
        calls.push('teardown');
      },
    })
  );
  ordered.host.uninstall('A');
  expect(calls).toEqual(['dispose', 'teardown']);

  // dispose 抛错时 teardown 仍被调用，disposeAll 不抛。
  const failing = makeHost();
  let teardownCalled = false;
  failing.host.install(
    makePlugin({
      name: 'A',
      dispose: () => {
        throw new Error('dispose failed');
      },
      install: () => () => {
        teardownCalled = true;
      },
    })
  );
  expect(() => failing.host.disposeAll()).not.toThrow();
  expect(teardownCalled).toBe(true);
});

test('install 返回 void 时仅调用 dispose', () => {
  const { host } = makeHost();
  let disposeCalls = 0;
  host.install(
    makePlugin({
      name: 'A',
      dispose: () => {
        disposeCalls += 1;
      },
    })
  );

  expect(() => host.uninstall('A')).not.toThrow();
  expect(disposeCalls).toBe(1);
});

test('disposeAll 逆序调用 dispose/teardown', () => {
  const { host } = makeHost();
  const order: string[] = [];
  host.install(
    makePlugin({
      name: 'A',
      install: () => () => {
        order.push('A');
      },
    })
  );
  host.install(
    makePlugin({
      name: 'B',
      install: () => () => {
        order.push('B');
      },
    })
  );

  host.disposeAll();

  expect(order).toEqual(['B', 'A']);
});

test('disposeAll 幂等', () => {
  const { host } = makeHost();
  let teardownCalls = 0;
  host.install(
    makePlugin({
      name: 'A',
      install: () => () => {
        teardownCalls += 1;
      },
    })
  );

  host.disposeAll();
  host.disposeAll();

  expect(teardownCalls).toBe(1);
});

test('单插件 teardown 抛错不影响其它插件卸载', () => {
  const { host, events } = makeHostWithEvents();
  let goodTeardownCalled = false;
  host.install(
    makePlugin({
      name: 'good',
      install: () => () => {
        goodTeardownCalled = true;
      },
    })
  );
  host.install(
    makePlugin({
      name: 'bad',
      install: () => () => {
        throw new Error('teardown boom');
      },
    })
  );

  expect(() => host.disposeAll()).not.toThrow();
  expect(goodTeardownCalled).toBe(true);
  expect(
    events.some(
      (event) => event.plugin === 'bad' && event.status === 'failed'
    )
  ).toBe(true);
});

test('createContext 抛错时 install 干净失败', () => {
  const resources = [new TestResourceRegistry()];
  const host = createGenericPluginHost<
    InstallablePlugin<TestContext>,
    TestContext
  >({
    createContext: () => {
      throw new Error('ctx fail');
    },
    resources,
  });

  expect(() =>
    host.install(
      makePlugin({
        name: 'a',
        install: () => {
          throw new Error('should not run');
        },
      })
    )
  ).toThrowError('ctx fail');
  expect(host.list()).toEqual([]);
  expect(resources[0].list()).toEqual([]);
});

test('uninstall 未安装/已卸载插件为幂等 no-op', () => {
  const { host } = makeHost();
  let teardownCalls = 0;
  host.install(
    makePlugin({
      name: 'A',
      install: () => () => {
        teardownCalls += 1;
      },
    })
  );

  expect(() => host.uninstall('nope')).not.toThrow();
  host.uninstall('A');
  expect(() => host.uninstall('A')).not.toThrow();
  expect(teardownCalls).toBe(1);
  expect(host.isInstalled('A')).toBe(false);
});

test('依赖保护：卸载被 active 插件依赖的插件抛 PLUGIN_DEPENDENCY_ACTIVE', () => {
  const { host } = makeHost();
  host.install(makePlugin({ name: 'B' }));
  host.install(makePlugin({ name: 'A', dependencies: ['B'] }));

  expect(() => host.uninstall('B')).toThrowError(
    expect.objectContaining({
      code: 'PLUGIN_DEPENDENCY_ACTIVE',
      details: expect.objectContaining({
        dependents: expect.arrayContaining(['A']),
      }),
    })
  );
  expect(host.isInstalled('A')).toBe(true);
  expect(host.isInstalled('B')).toBe(true);
});

test('disposeAll 逆序卸载依赖项不抛依赖保护', () => {
  const { host } = makeHost();
  host.install(makePlugin({ name: 'B' }));
  host.install(makePlugin({ name: 'A', dependencies: ['B'] }));

  expect(() => host.disposeAll()).not.toThrow();
  expect(host.isInstalled('A')).toBe(false);
  expect(host.isInstalled('B')).toBe(false);
});

test('资源来源变化后 uninstall 不删除它', () => {
  const { host, resources } = makeHost();
  host.install(
    makePlugin({
      name: 'A',
      install: (context) => {
        context.registry.register('X', 'a');
      },
    })
  );

  // 模拟资源被其它来源重新注册：先按原 source 移除，再以新 source 注册。
  resources[0].unregister('X', 'a');
  resources[0].register('X', 'b');

  host.uninstall('A');

  expect(resources[0].list()).toEqual([{ name: 'X', source: 'b' }]);
});
