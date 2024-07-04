import { bench, describe } from "vitest";
import { createHooks } from "../src/index";
import { serialTaskCaller, parallelTaskCaller } from "../src/utils";

describe("empty serialTaskCaller", () => {
  const emptyTasks = [];

  bench("empty serialTaskCaller", () => {
    return serialTaskCaller(emptyTasks, []);
  });

  bench("empty serialTaskCaller with argument", () => {
    return serialTaskCaller(emptyTasks, [1]);
  });

  bench("empty serialTaskCaller with arguments", () => {
    return serialTaskCaller(emptyTasks, [1, 2, 3, 4, 5]);
  });
});

describe("serialTaskCaller", () => {
  const mixedTasks: (() => Promise<void> | void)[] = [];

  for (let i = 0; i < 10; i += 1) {
    mixedTasks.push(i % 2 === 2 ? () => Promise.resolve() : () => {});
  }

  bench("serialTaskCaller", () => {
    return serialTaskCaller(mixedTasks, []);
  });

  bench("serialTaskCaller with argument", () => {
    return serialTaskCaller(mixedTasks, [1]);
  });

  bench("serialTaskCaller with arguments", () => {
    return serialTaskCaller(mixedTasks, [1, 2, 3, 4, 5]);
  });
});

describe("empty parallelTaskCaller", () => {
  const emptyTasks = [];

  bench("empty parallelTaskCaller", () => {
    return parallelTaskCaller(emptyTasks, []) as unknown as Promise<void>;
  });

  bench("empty parallelTaskCaller with argument", () => {
    return parallelTaskCaller(emptyTasks, [1]) as unknown as Promise<void>;
  });

  bench("empty parallelTaskCaller with arguments", () => {
    return parallelTaskCaller(
      emptyTasks,
      [1, 2, 3, 4, 5]
    ) as unknown as Promise<void>;
  });
});

describe("parallelTaskCaller", () => {
  const mixedTasks: (() => Promise<void> | void)[] = [];

  for (let i = 0; i < 10; i += 1) {
    mixedTasks.push(i % 2 === 2 ? () => Promise.resolve() : () => {});
  }

  bench("parallelTaskCaller", () => {
    return parallelTaskCaller(mixedTasks, []) as unknown as Promise<void>;
  });

  bench("parallelTaskCaller with argument", () => {
    return parallelTaskCaller(mixedTasks, [1]) as unknown as Promise<void>;
  });

  bench("parallelTaskCaller with arguments", () => {
    return parallelTaskCaller(
      mixedTasks,
      [1, 2, 3, 4, 5]
    ) as unknown as Promise<void>;
  });
});

describe("empty callHook", () => {
  const hooks = createHooks();

  bench("empty callHook", () => {
    return hooks.callHook("hello");
  });

  bench("empty callHook with argument", () => {
    return hooks.callHook("hello", 1);
  });

  bench("empty callHook with five arguments", () => {
    return hooks.callHook("hello", 1, 2, 3, 4, 5);
  });
});

describe("empty callHookParallel", () => {
  const hooks = createHooks();

  bench("empty callHookParallel", () => {
    return hooks.callHookParallel("hello") as unknown as Promise<void>;
  });

  bench("empty callHookParallel with argument", () => {
    return hooks.callHookParallel("hello", 1) as unknown as Promise<void>;
  });

  bench("empty callHookParallel with five arguments", () => {
    return hooks.callHookParallel(
      "hello",
      1,
      2,
      3,
      4,
      5
    ) as unknown as Promise<void>;
  });
});

describe("callHook", () => {
  const hooks = createHooks();

  for (let i = 0; i < 10; i += 1) {
    hooks.hook("hello", i % 2 === 2 ? () => Promise.resolve() : () => {});
  }

  bench("callHook", () => {
    return hooks.callHook("hello");
  });

  bench("callHook with argument", () => {
    return hooks.callHook("hello", 1);
  });

  bench("callHook with five arguments", () => {
    return hooks.callHook("hello", 1, 2, 3, 4, 5);
  });
});

describe("callHookParallel", () => {
  const hooks = createHooks();

  for (let i = 0; i < 10; i += 1) {
    hooks.hook("hello", i % 2 === 2 ? () => Promise.resolve() : () => {});
  }

  bench("callHookParallel", () => {
    return hooks.callHookParallel("hello") as unknown as Promise<void>;
  });

  bench("callHookParallel with argument", () => {
    return hooks.callHookParallel("hello", 1) as unknown as Promise<void>;
  });

  bench("callHookParallel with five arguments", () => {
    return hooks.callHookParallel(
      "hello",
      1,
      2,
      3,
      4,
      5
    ) as unknown as Promise<void>;
  });
});

describe("hook", () => {
  let hooks = createHooks();

  bench(
    "hook",
    () => {
      hooks.hook("hello", () => {});
    },
    {
      setup: () => {
        hooks = createHooks();
      },
    }
  );

  const createDeprecateHooks = () => {
    const instance = createHooks();

    instance.deprecateHook("hello", "This hook is deprecated");

    return instance;
  };

  let deprecatedHooks = createDeprecateHooks();

  bench(
    "hook with deprecate",
    () => {
      hooks.hook("hello", () => {});
    },
    {
      setup: () => {
        deprecatedHooks = createDeprecateHooks();
      },
    }
  );
});
