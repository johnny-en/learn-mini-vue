## learn-mini-vue

 通过 TDD（Test-Driven Development）的开发方式由浅入深的理解 vue3 的 reactivity、runtime-core、runtime-dom，compiler-core 模块的核心逻辑实现及各模块之间的关联关系
### Tasking

#### reactivity

- [x] effect 的实现
- [x] track 依赖收集
- [x] trigger 触发依赖
- [x] reactive 的实现
- [x] 支持 effect.scheduler
- [x] 支持 effect.stop
- [x] ref 的实现
- [x] readonly 的实现
- [x] computed 的实现
- [x] 支持 isReactive
- [x] 支持 isReadonly
- [x] 支持 isProxy
- [x] 支持 shallowReadonly
- [x] 支持 proxyRefs

#### runtime-core

- [x] 支持组件类型
- [x] 支持 $el api
- [x] 支持 element 类型
- [x] 初始化 props
- [x] setup 可获取 props 和 context
- [x] 支持 component emit
- [x] 支持 Text 类型节点
- [x] 支持 getCurrentInstance
- [x] 支持 provide/inject
- [x] 支持 proxy
- [x] 可以在 render 函数中获取 setup 返回的对象
- [x] 支持最基础的 slots
- [x] nextTick 的实现
- [x] 支持 watchEffect

### runtime-dom
- [x] 支持 custom renderer 

### compiler-core
- [x] 解析插值
- [x] 解析 element
- [x] 解析 text

### 构建
- [x] monorepo with pnpm

### build
```shell
pnpm build
```

### test
```shell
pnpm test
```
或 

```shell
pnpm test *
```
[\*]: 为 packages/[compiler-core|reactivity|runtime-core]/__tests__/[\*].spec.ts


### example

使用 server 打开 packages/vue/examples/\*/index.html

## 参考
[mini-vue](https://github.com/cuixiaorui/mini-vue) 