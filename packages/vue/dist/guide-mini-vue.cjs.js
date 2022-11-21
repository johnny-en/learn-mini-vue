'use strict';

function toDisplayString(value) {
    return String(value);
}

const extend = Object.assign;
const EMPTY_OBJ = {};
const isObject = (value) => value !== null && typeof value === "object";
const isString = (value) => typeof value === "string";
const hasChange = (value, newValue) => {
    return !Object.is(value, newValue);
};
const hasOwn = (target, key) => Object.prototype.hasOwnProperty.call(target, key);
// add -> Add
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
// add -> onAdd
const toHandlerKey = (str) => str ? "on" + capitalize(str) : "";
// add-foo -> addFoo
const camelize = (str) => str.replace(/-(\w)/g, (_, s) => (s ? s.toUpperCase() : ""));

let activeEffect_data;
let shouldTrack_data = false;
const targetMap_data = new Map();
function activeEffect() {
    return activeEffect_data;
}
function setActiveEffect(value) {
    activeEffect_data = value;
    return true;
}
function shouldTrack() {
    return shouldTrack_data;
}
function setShouldTrack(value) {
    shouldTrack_data = value;
}
function targetMap() {
    return targetMap_data;
}

class ReactiveEffect {
    constructor(fn, scheduler) {
        this.deps = [];
        this.active = true;
        this._fn = fn;
        this.scheduler = scheduler;
    }
    run() {
        // 执行 stop 后不在进行收集依赖
        if (!this.active) {
            return this._fn();
        }
        // 收集依赖
        setShouldTrack(true);
        setActiveEffect(this);
        const result = this._fn();
        setShouldTrack(false);
        return result;
    }
    stop() {
        if (this.active) {
            cleanUpEffect(this);
            if (this.onStop) {
                this.onStop();
            }
            this.active = false; // 记录 effect 是否完成清除，防止重复执行
        }
    }
}
function cleanUpEffect(effect) {
    effect.deps.forEach((dep) => dep.delete(effect));
    effect.deps.length = 0;
}
function isTracking() {
    return shouldTrack() && activeEffect() !== undefined;
}
function track(target, key) {
    if (!isTracking())
        return;
    let depsMap = targetMap().get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap().set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    trackEffects(dep);
}
function trackEffects(dep) {
    if (dep.has(activeEffect()))
        return;
    dep.add(activeEffect());
    activeEffect().deps.push(dep);
}
function trigger(target, key) {
    const depsMap = targetMap().get(target);
    if (!depsMap)
        return;
    const dep = depsMap.get(key);
    triggerEffect(dep);
}
function triggerEffect(dep) {
    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}
function effect(fn, options = {}) {
    const _effect = new ReactiveEffect(fn, options.scheduler);
    extend(_effect, options);
    _effect.run();
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
}
function stop(runner) {
    runner.effect.stop();
}

function getter(isReadonly = false, isShallow = false) {
    return function get(target, key) {
        const result = Reflect.get(target, key);
        if (key === "__v_isReactive" /* ReactiveFlags.IS_REACTIVE */) {
            return !isReadonly;
        }
        if (key === "__v_isReadonly" /* ReactiveFlags.IS_READONLY */) {
            return isReadonly;
        }
        if (isShallow) {
            return result;
        }
        if (isObject(result)) {
            return isReadonly ? readonly(result) : reactive(result);
        }
        if (!isReadonly) {
            // 收集依赖
            track(target, key);
        }
        return result;
    };
}
function setter() {
    return function set(target, key, value) {
        const result = Reflect.set(target, key, value);
        // 触发依赖
        trigger(target, key);
        return result;
    };
}
const mutableHandlers = createMutableHandlers();
function createMutableHandlers() {
    return {
        get: getter(),
        set: setter(),
    };
}
const readonlyHandlers = createReadonlyHandlers();
function createReadonlyHandlers() {
    return {
        get: getter(true),
        set(target, key, value) {
            console.warn(`The [${key}] set on failed, target is an readonly`);
            return true;
        },
    };
}
const shallowReadonlyHandlers = createShallowReadonlyHandlers();
function createShallowReadonlyHandlers() {
    return extend({}, readonlyHandlers, {
        get: getter(true, true),
    });
}

function reactive(raw) {
    return creatActiveObject(raw, mutableHandlers);
}
function readonly(raw) {
    return creatActiveObject(raw, readonlyHandlers);
}
function shallowReadonly(raw) {
    return creatActiveObject(raw, shallowReadonlyHandlers);
}
function isReactive(value) {
    return !!value["__v_isReactive" /* ReactiveFlags.IS_REACTIVE */];
}
function isReadonly(value) {
    return !!value["__v_isReadonly" /* ReactiveFlags.IS_READONLY */];
}
function isProxy(value) {
    return isReactive(value) || isReadonly(value);
}
function creatActiveObject(target, baseHandlers) {
    if (!isObject(target)) {
        console.warn(`target: ${target} must be an object`);
        return target;
    }
    return new Proxy(target, baseHandlers);
}

class RefImpl {
    constructor(value) {
        this.__v_isRef = true;
        this._rawValue = value;
        this._value = convert(value);
        this.dep = new Set();
    }
    get value() {
        trackRefValue(this);
        return this._value;
    }
    set value(newValue) {
        if (hasChange(this._rawValue, newValue)) {
            this._rawValue = newValue;
            this._value = convert(newValue);
            triggerEffect(this.dep);
        }
    }
}
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
function trackRefValue(ref) {
    if (isTracking()) {
        trackEffects(ref.dep);
    }
}
function ref(value) {
    return new RefImpl(value);
}
function isRef(ref) {
    return !!ref.__v_isRef;
}
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
function proxyRefs(ref) {
    return new Proxy(ref, {
        get(target, key) {
            return unRef(Reflect.get(target, key));
        },
        set(target, key, newValue) {
            if (isRef(target[key]) && !isRef(newValue)) {
                return (target[key].value = newValue);
            }
            else {
                return Reflect.set(target, key, newValue);
            }
        },
    });
}

function emit(instance, event, ...args) {
    const { props } = instance;
    /**
     * 转换 event
     * add -> onAdd | add-foo -> onAddFoo
     *  */
    const handlerName = toHandlerKey(camelize(event));
    const handler = props[handlerName];
    if (handler) {
        handler(...args);
    }
}

function initProps(instance, rawProps = {}) {
    instance.props = rawProps;
}

const publicPropertiesMap = {
    $el: (instance) => instance.vnode.el,
    $slots: (instance) => instance.slots,
    $props: (instance) => instance.props,
};
const publicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        const publicProperties = publicPropertiesMap[key];
        if (publicProperties) {
            return publicProperties(instance);
        }
    },
};

function initSlots(instance, children) {
    const { vnode } = instance;
    if (vnode.shapeFlag & 16 /* ShapeFlags.SLOT_CHILDREN */) {
        normalizeObjectSlots(children, instance.slots);
    }
}
function normalizeObjectSlots(children, slots) {
    for (const key in children) {
        // value 是 slot 定义时返回的函数，为了给 slot 传递 props 实现作用域插槽
        const value = children[key];
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
}
function normalizeSlotValue(value) {
    // 统一返回数组，支持多个 slot
    return Array.isArray(value) ? value : [value];
}

let currentInstance_data = null;
let compiler_data;
function currentInstance() {
    return currentInstance_data;
}
function setCurrentInstance(value) {
    currentInstance_data = value;
}
function compiler() {
    return compiler_data;
}
function setCompiler(value) {
    compiler_data = value;
}

function createComponentInstance(vnode, parent) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        slots: {},
        provides: parent ? parent.provides : {},
        parent,
        isMounted: false,
        subTree: {},
        next: null,
        emit: () => { },
    };
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    initProps(instance, instance.vnode.props);
    initSlots(instance, instance.vnode.children);
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    /**
     * 创建代理对象
     * 调用 render 时 call 创建的代理对象，作用域指向这个代理对象
     * 在 render 中，使用 this.xxx 获取 setup 返回的数据对象
     */
    instance.proxy = new Proxy({ _: instance }, publicInstanceProxyHandlers);
    const Component = instance.type;
    const { setup } = Component;
    if (setup) {
        setCurrentInstance(instance);
        // 只是首层 props 只读不可修改
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit,
        });
        setCurrentInstance(null);
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    /**
     * setupResult: function | object
     * function -> 组件的 render 函数
     * object -> 注入到 component 上下文
     * */
    if (typeof setupResult === "object") {
        instance.setupState = proxyRefs(setupResult);
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    const compilerFn = compiler();
    if (compilerFn && !Component.render) {
        if (Component.template) {
            Component.render = compilerFn(Component.template);
        }
    }
    instance.render = Component.render;
}
function getCurrentInstance() {
    return currentInstance();
}
function registerRuntimeCompiler(_compiler) {
    setCompiler(_compiler);
}

function shouldUpdateComponent(prevVNode, nextVNode) {
    const { props: prevProps } = prevVNode;
    const { props: nextProps } = nextVNode;
    for (const key in nextProps) {
        if (prevProps[key] !== nextProps[key]) {
            return true;
        }
        return false;
    }
}

const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createVNode$1(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        el: null,
        component: null,
        key: props && props.key,
        shapeFlag: shapeFlag(type),
    };
    setChildrenShapeFlag(vnode);
    setSlotsShapeFlag(vnode);
    return vnode;
}
function createTextVNode(text) {
    return createVNode$1(Text, {}, text);
}
function shapeFlag(type) {
    return typeof type === "string"
        ? 1 /* ShapeFlags.ELEMENT */
        : 2 /* ShapeFlags.STATEFUL_COMPONENT */;
}
/**
 * 设置 vnode 子节点类型
 * 0001 | 0100 -> 0101
 * vnode 是元素类型，children 是文本类型
 * 0010 | 1000 -> 1010
 * vnode 是组件类型，children 是数据类型
 */
function setChildrenShapeFlag(vnode) {
    const { children } = vnode;
    if (typeof children === "string") {
        vnode.shapeFlag |= 4 /* ShapeFlags.TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag |= 8 /* ShapeFlags.ARRAY_CHILDREN */;
    }
}
/**
 * 设置 vnode slot 类型
 * 当 vnode 类型是组件 & 子节点是对象类型
 * 0001 | 10000 -> 10001
 */
function setSlotsShapeFlag(vnode) {
    if (vnode.shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
        if (typeof vnode.children === "object") {
            vnode.shapeFlag |= 16 /* ShapeFlags.SLOT_CHILDREN */;
        }
    }
}

function createAppAPI(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                /**
                 * 将 component -> vnode
                 * 所有的逻辑操作都是基于 vnode 做处理
                 * */
                const vnode = createVNode$1(rootComponent);
                render(vnode, rootContainer);
            },
        };
    };
}

const queue = []; // 组件更新队列
const activePreFlushCbs = []; // watchEffect 的 fn 队列
let isFlushPending = false;
function queueJobs(job) {
    if (!queue.includes(job)) {
        queue.push(job);
    }
    queueFlush();
}
function nextTick(fn) {
    const P = Promise.resolve();
    return fn ? P.then(fn) : P;
}
function queueFlush() {
    // nextTick 只需要执行一次，统一执行所有 jobs
    if (isFlushPending)
        return;
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

function createRenderer(options) {
    // 外部的自定义渲染接口
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText, } = options;
    function render(vnode, container) {
        // 调用 patch 方法
        patch(null, vnode, container, null, null);
    }
    /**
     *
     * @param n1 老的 vnode：n1 不存在组件创建，存在组件更新
     * @param n2 新的 vnode
     * @param container
     * @param parentComponent
     */
    function patch(n1, n2, container, parentComponent, anchor) {
        switch (n2.type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent, anchor);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                if (n2.shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    // if vnode -> element -> 处理 element
                    processElement(n1, n2, container, parentComponent, anchor);
                }
                else if (n2.shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
                    // if vnode -> 组件 -> 处理组件
                    processComponent(n1, n2, container, parentComponent, anchor);
                }
                break;
        }
    }
    function processText(n1, n2, container) {
        const { children } = n2;
        const textNode = (n2.el = document.createTextNode(children));
        container.append(textNode);
    }
    function processFragment(n1, n2, container, parentComponent, anchor) {
        mountChildren(n2.children, container, parentComponent, anchor);
    }
    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            mountElement(n2, container, parentComponent, anchor);
        }
        else {
            patchElement(n1, n2, container, parentComponent, anchor);
        }
    }
    function patchElement(n1, n2, contaniner, parentComponent, anchor) {
        console.log("patchElement");
        // console.log("n1", n1);
        // console.log("n2", n2);
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        /**
         * 挂载 el 是在创建元素 mountElement 阶段赋值的
         * 在 setupRenderEffect 进入更新阶段时，新的 vnode.el 还未有赋值
         * 所以在这给 新的 vnode.el 赋值
         * */
        const el = (n2.el = n1.el);
        patchChildren(n1, n2, el, parentComponent, anchor);
        patchPorps(el, oldProps, newProps);
    }
    function patchChildren(n1, n2, container, parentComponent, anchor) {
        const { shapeFlag: prevShapeFlag, children: c1 } = n1;
        const { shapeFlag, children: c2 } = n2;
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            // 旧节点是数组，新节点是文本 (array -> text)
            if (prevShapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
                // 删除旧的 children
                unmountChildren(c1);
            }
            // 旧节点是数组 (array -> text) | 旧节点的文本 !== 新节点的文本 (text -> text)
            if (c1 !== c2) {
                // 更新 children -> text
                hostSetElementText(container, c2);
            }
        }
        else {
            // 旧节点是文本，新节点是数组 (text -> array)
            if (prevShapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
                hostSetElementText(container, "");
                mountChildren(c2, container, parentComponent, anchor);
            }
            else {
                // 旧节点是数组，新节点是数组 (array -> array)
                patchKeyedChildren(c1, c2, container, parentComponent, anchor);
            }
        }
    }
    // 双端对比 diff
    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
        const l2 = c2.length;
        let i = 0;
        let e1 = c1.length - 1;
        let e2 = l2 - 1;
        function isSomeVNodeType(n1, n2) {
            return n1.type === n2.type && n1.key === n2.key;
        }
        // 1 左侧比较
        while (i <= e1 && i <= e2) {
            const n1 = c1[i];
            const n2 = c2[i];
            if (isSomeVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            i++;
        }
        // 2 右侧比较
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1];
            const n2 = c2[e2];
            if (isSomeVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            e1--;
            e2--;
        }
        if (i > e1) {
            if (i <= e2) {
                // 新的比老的多，创建新增的节点
                const nextPos = e2 + 1;
                const anchor = nextPos < l2 ? c2[nextPos].el : null;
                while (i <= e2) {
                    patch(null, c2[i], container, parentComponent, anchor);
                    i++;
                }
            }
        }
        else if (i > e2) {
            // 删除节点
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        }
        else {
            /**
             * 中间对比
             * s1，s2: 中间区间的起始位置
             * patched：已经处理新节点的数量
             * toBePatched: 记录新节点需要处理的数量
             * moved: 新的节点移动的开关
             * maxNewIndexSoFar: 记录新的节点序列的最后一个节点的索引
             *                   当遍历的新节点小于记录的索引时，需要移动节点
             *                   因为索引递增是稳定的节点，不稳定的需要移动
             * ---------------
             * a b (c d e) f g
             *     [3 4 5]
             * a b (e c d) f g
             *     [5 3 4]
             * ---------------
             **/
            let s1 = i;
            let s2 = i;
            let patched = 0;
            let moved = false;
            let maxNewIndexSoFar = 0;
            const toBePatched = e2 - s2 + 1;
            const keyToNewIndexMap = new Map();
            const newIndexToOldIndexMap = new Array(toBePatched);
            // 初始化为 0 , 新值在老的里面不存在
            for (let i = 0; i < toBePatched; i++) {
                newIndexToOldIndexMap[i] = 0;
            }
            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i];
                keyToNewIndexMap.set(nextChild.key, i);
            }
            for (let i = s1; i <= e1; i++) {
                const prevChild = c1[i];
                // 当老节点大与新节点数量，并且新节点已经处理完成，直接删除老节点
                if (patched >= toBePatched) {
                    hostRemove(prevChild.el);
                    continue;
                }
                let newIndex;
                if (prevChild.key != null) {
                    // 使用 key 快速查找老节点是否存在于新节点中
                    newIndex = keyToNewIndexMap.get(prevChild.key);
                }
                else {
                    for (let j = s2; j <= e2; j++) {
                        if (isSomeVNodeType(prevChild, c2[j])) {
                            newIndex = j;
                            break;
                        }
                    }
                }
                if (newIndex === undefined) {
                    hostRemove(prevChild.el);
                }
                else {
                    // 优化
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
                        moved = true;
                    }
                    /**
                     * 设置新节点在老节点中的映射序列
                     * ---------------
                     * a b (c d e) f g
                     *     [3 4 5]
                     * a b (e c d) f g
                     *     [5 3 4]
                     * ---------------
                     * i + 1 是因为 i 有可能是 0
                     */
                    newIndexToOldIndexMap[newIndex - s2] = i + 1;
                    patch(prevChild, c2[newIndex], container, parentComponent, null);
                    patched++;
                }
            }
            /**
             * 处理移动
             * 执行最长递增子序列函数，获取稳定的节点序列
             * 通过 moved 进行优化，对需要移动的节点，执行 LIS 算法
             */
            const increasingNewIndexSequence = moved
                ? IndexOfLIS(newIndexToOldIndexMap)
                : [];
            let j = increasingNewIndexSequence.length - 1;
            /**
             * 用新节点中的稳定的节点序列与老的节点序列比较，移动不稳定的节点
             * 这里使用倒序来处理
             * 因为插入节点使用的是 insertBefore 要在稳定的节点前插入
             * 有稳定的元素 -> 插入到稳定元素之前
             * 无稳定的元素 -> 插入到父节点的子节点列表的末尾
             * -----------------------------
             *      a b | (c d e) | f g
             *            [0,1,2]
             *      a b | (e d c) | f g
             *            [2,1,0]
             * 稳定的节点 |        | 稳定的节点
             * [0] 最长递增子序列 -> [2,1] 需要移动
             * -----------------------------
             *      a b | (c d e)
             *            [0,1,2]
             *      a b | (e c d)
             *            [2,0,1]
             * [0,1] 最长递增子序列 -> [2] 需要移动
             * 稳定的节点 |
             * -----------------------------
             */
            for (let i = toBePatched - 1; i >= 0; i--) {
                const nextIndex = i + s2;
                const nextChild = c2[nextIndex];
                const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null;
                if (newIndexToOldIndexMap[i] === 0) {
                    // 创建节点
                    // 老节点不存在，新节点存在
                    patch(null, nextChild, container, parentComponent, anchor);
                }
                else if (moved) {
                    if (j < 0 || i !== increasingNewIndexSequence[j]) {
                        console.log("移动位置");
                        hostInsert(nextChild.el, container, anchor);
                    }
                    else {
                        j--;
                    }
                }
            }
        }
    }
    function unmountChildren(children) {
        for (let i = 0; i < children.length; i++) {
            const el = children[i].el;
            hostRemove(el);
        }
    }
    function patchPorps(el, oldProps, newProps) {
        if (oldProps !== newProps) {
            for (const key in newProps) {
                const prevProp = oldProps[key];
                const nextProp = newProps[key];
                if (prevProp !== newProps) {
                    hostPatchProp(el, key, prevProp, nextProp);
                }
            }
            if (oldProps !== EMPTY_OBJ) {
                for (const key in oldProps) {
                    if (!(key in newProps)) {
                        hostPatchProp(el, key, oldProps[key], null);
                    }
                }
            }
        }
    }
    /**
     * 自定义渲染器
     * 将之前在这里处理 dom 的逻辑（创建元素，props，插入元素）抽离出去
     * 对外提供接口，由外部来实现
     */
    function mountElement(vnode, container, parentComponent, anchor) {
        const el = (vnode.el = hostCreateElement(vnode.type));
        // 处理 children: string | array
        const { children, shapeFlag } = vnode;
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            mountChildren(vnode.children, el, parentComponent, anchor);
        }
        // 处理 props
        const { props } = vnode;
        for (const key in props) {
            const value = props[key];
            hostPatchProp(el, key, null, value);
        }
        hostInsert(el, container, anchor);
    }
    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach((vnode) => {
            patch(null, vnode, container, parentComponent, anchor);
        });
    }
    function processComponent(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            mountComponent(n2, container, parentComponent, anchor);
        }
        else {
            updateComponent(n1, n2);
        }
    }
    function updateComponent(n1, n2) {
        // 更新组件实现
        const instance = (n2.component = n1.component);
        // prop 的值更新时，更新组件
        if (shouldUpdateComponent(n1, n2)) {
            instance.next = n2;
            instance.update();
        }
        else {
            n2.el = n1.el;
            instance.vnode = n2;
        }
    }
    function mountComponent(vnode, container, parentComponent, anchor) {
        // 保存组件实例
        const instance = (vnode.component = createComponentInstance(vnode, parentComponent));
        setupComponent(instance);
        setupRenderEffect(instance, vnode, container, anchor);
    }
    function setupRenderEffect(instance, initialVNode, container, anchor) {
        /**
         * 使用 effect 包裹是因为要在这里做依赖收集操作
         * 因组件 render 函数中的响应对象的 get 操作被触发时，会触发依赖收集
         * 响应对象数据更新时，会触发收集的依赖
         */
        instance.update = effect(() => {
            if (!instance.isMounted) {
                // 组件初始化
                const { proxy } = instance;
                const subTree = (instance.subTree = instance.render.call(proxy, proxy));
                console.log("init", subTree);
                patch(null, subTree, container, instance, anchor);
                // 当前根元素虚拟节点 el -> 当前组件虚拟节点 el 上
                initialVNode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                // 组件更新
                console.log("update component");
                const { next, vnode } = instance;
                if (next) {
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next);
                }
                const { proxy } = instance;
                const subTree = instance.render.call(proxy, proxy);
                const prevSubTree = instance.subTree;
                instance.subTree = subTree;
                patch(prevSubTree, subTree, container, instance, anchor);
            }
        }, {
            scheduler() {
                /**
                 * 异步更新视图
                 * 创建 Promise 将 effect 返回的 runner 函数添加到微任务中
                 * 同步任务执行完，执行微任务
                 */
                console.log("update scheduler");
                queueJobs(instance.update);
            },
        });
    }
    return {
        createApp: createAppAPI(render),
    };
}
function updateComponentPreRender(instance, nextVNode) {
    instance.vnode = nextVNode;
    instance.next = null;
    instance.props = nextVNode.props;
}
/**
 * 最长递增子序列(Longest Increasing Subsequence)
 * [10,9,2,5,3,7] -> [2,3,7] 最长递增序列 -> [2,4,5] 最长递增序列的下标
 * 时间复杂度：O(nlog(n))
 * @param nums: number[]
 * @returns: number[] 最长递增子序列的下标
 */
function IndexOfLIS(nums) {
    let n = nums.length;
    if (n === 0)
        return [];
    let arr = [];
    arr[0] = 0;
    for (let i = 1; i < n; i++) {
        /**
         * 值为 0 表示不需要移动的节点
         * 因为该节点在老的里没有，新的里面存在，需要新增的节点
         * */
        if (nums[i] === 0) {
            continue;
        }
        if (nums[arr[i - 1]] < nums[i]) {
            arr.push(i);
        }
        else {
            let l = 0;
            let r = arr.length - 1;
            let flag = -1;
            while (l <= r) {
                let mid = (l + r) >> 1;
                if (nums[arr[mid]] < nums[i]) {
                    flag = mid;
                    l = mid + 1;
                }
                else {
                    r = mid - 1;
                }
            }
            if (nums[arr[flag + 1]] !== nums[i]) {
                arr[flag + 1] = i;
            }
        }
    }
    return arr;
}

function h(type, props, children) {
    return createVNode$1(type, props, children);
}

function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        if (typeof slot === "function") {
            return createVNode$1(Fragment, {}, slot(props));
        }
    }
}

function provide(key, value) {
    const instance = currentInstance();
    if (instance) {
        let { provides } = instance;
        const parentProvides = instance.parent.provides;
        if (provides === parentProvides) {
            /**
             * 当前组件的 provides 等于父级的 provides 时
             * 将父级的 provides 作为当前组件 provides 的原型
             * */
            provides = instance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}
function inject(key, defaultValue) {
    const instance = currentInstance();
    if (instance) {
        const parentProvides = instance.parent.provides;
        if (key in parentProvides) {
            return parentProvides[key];
        }
        else if (defaultValue) {
            if (typeof defaultValue === "function") {
                return defaultValue();
            }
            return defaultValue;
        }
    }
}

function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, prevValue, nextValue) {
    const isOn = (value) => /^on[A-Z]/.test(value);
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, nextValue);
    }
    else {
        if (nextValue === null || nextValue === undefined) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, nextValue);
        }
    }
}
function insert(child, parent, anchor = null) {
    parent.insertBefore(child, anchor);
}
function remove(child) {
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
function setElementText(el, text) {
    el.textContent = text;
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText,
});
function createApp(...args) {
    return renderer.createApp(...args);
}

var runtimeDom = /*#__PURE__*/Object.freeze({
    __proto__: null,
    createApp: createApp,
    createRenderer: createRenderer,
    h: h,
    renderSlots: renderSlots,
    createTextVNode: createTextVNode,
    createElementVNode: createVNode$1,
    getCurrentInstance: getCurrentInstance,
    registerRuntimeCompiler: registerRuntimeCompiler,
    provide: provide,
    inject: inject,
    nextTick: nextTick,
    toDisplayString: toDisplayString,
    ref: ref,
    proxyRefs: proxyRefs,
    unRef: unRef,
    isRef: isRef,
    reactive: reactive,
    readonly: readonly,
    shallowReadonly: shallowReadonly,
    isReactive: isReactive,
    isReadonly: isReadonly,
    isProxy: isProxy,
    ReactiveEffect: ReactiveEffect,
    effect: effect,
    stop: stop
});

const TO_DISPLAY_STRING = Symbol("toDisplayString");
const CREATE_ELEMENT_VNODE = Symbol("createElementVNode");
const helperMapName = {
    [TO_DISPLAY_STRING]: "toDisplayString",
    [CREATE_ELEMENT_VNODE]: "createElementVNode",
};

// 生成代码
function generate(ast) {
    const context = createCodegenContext();
    const { push } = context;
    genFunctionPreamble(ast, context);
    const functionName = "render";
    const args = ["_ctx", "_cache"];
    const signature = args.join(", ");
    // console.log("----- codegen ast -----",ast);
    push(`function ${functionName}(${signature}){`);
    push("return ");
    genNode(ast.codegenNode, context);
    push("}");
    return {
        code: context.code,
    };
}
// 生成导入代码
function genFunctionPreamble(ast, context) {
    const { push } = context;
    const VueBinging = "Vue";
    const aliasHelper = (s) => `${helperMapName[s]}: _${helperMapName[s]}`;
    if (ast.helpers.length > 0) {
        push(`const { ${ast.helpers.map(aliasHelper).join(", ")} } = ${VueBinging}`);
    }
    push("\n");
    push("return ");
}
function createCodegenContext() {
    const context = {
        code: "",
        push(source) {
            context.code += source;
        },
        helper(key) {
            return `_${helperMapName[key]}`;
        },
    };
    return context;
}
function genNode(node, context) {
    switch (node.type) {
        case 3 /* NodeTypes.TEXT */:
            genText(node, context);
            break;
        case 0 /* NodeTypes.INTERPOLATION */:
            genInterpolation(node, context);
            break;
        case 1 /* NodeTypes.SIMPLE_EXPRESSION */:
            genExpression(node, context);
            break;
        case 2 /* NodeTypes.ELEMENT */:
            genElement(node, context);
            break;
        case 5 /* NodeTypes.COMPOUND_EXPRESSION */:
            genCompoundExpression(node, context);
            break;
    }
}
function genCompoundExpression(node, context) {
    const children = node.children;
    const { push } = context;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isString(child)) {
            push(child);
        }
        else {
            genNode(child, context);
        }
    }
}
function genElement(node, context) {
    const { push, helper } = context;
    const { tag, children, props } = node;
    push(`${helper(CREATE_ELEMENT_VNODE)}(`);
    genNodeList(genNullable([tag, props, children]), context);
    push(")");
}
function genNodeList(nodes, context) {
    const { push } = context;
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isString(node)) {
            push(node);
        }
        else {
            genNode(node, context);
        }
        if (i < nodes.length - 1) {
            push(", ");
        }
    }
}
function genNullable(agrs) {
    return agrs.map((arg) => arg || "null");
}
function genExpression(node, context) {
    const { push } = context;
    push(`${node.content}`);
}
function genInterpolation(node, context) {
    const { push, helper } = context;
    push(`${helper(TO_DISPLAY_STRING)}(`);
    genNode(node.content, context);
    push(")");
}
function genText(node, context) {
    const { push } = context;
    push(`'${node.content}'`);
}

function baseParse(content) {
    const context = createParserContext(content);
    return createRoot(parseChildren(context, []));
}
/**
 *
 * @param ancestors 祖先元素栈
 * @returns
 */
function parseChildren(context, ancestors) {
    const nodes = [];
    while (!isEnd(context, ancestors)) {
        let node;
        const s = context.source;
        if (s.startsWith("{{")) {
            node = parseInterpolation(context);
        }
        else if (s[0] === "<") {
            if (/[a-z]/i.test(s[1])) {
                node = parseElement(context, ancestors);
            }
        }
        if (!node) {
            node = parseText(context);
        }
        nodes.push(node);
    }
    return nodes;
}
function isEnd(context, ancestors) {
    // 结束标签
    const s = context.source;
    if (s.startsWith("</")) {
        for (let i = ancestors.length - 1; i >= 0; i--) {
            if (startsWithEndTagOpen(s, ancestors[i].tag)) {
                return true;
            }
        }
    }
    // sources 为空时
    return !context.source;
}
function parseText(context) {
    let endIndex = context.source.length;
    let endTokens = ["<", "{{"];
    // 查找 source 是否还包含有其他的类型
    for (let i = 0; i < endTokens.length; i++) {
        const index = context.source.indexOf(endTokens[i]);
        // 从左 -> 右处理找到的类型，所以 index < endIndex
        if (index !== -1 && index < endIndex) {
            endIndex = index;
        }
    }
    // 获取 content
    const content = parseTextData(context, endIndex);
    // console.log("-----parseText context.source-----", content, context);
    return {
        type: 3 /* NodeTypes.TEXT */,
        content: content,
    };
}
function parseTextData(context, length) {
    const content = context.source.slice(0, length);
    // 清除处理完成的代码 context.source
    advanceBy(context, length);
    return content;
}
function parseElement(context, ancestors) {
    // 解析 tag
    const element = parseTag(context, 0 /* TagType.Start */);
    ancestors.push(element);
    // 解析 tag 后，source 可能还包含子级，所以，再次调用 parseChildren
    element.children = parseChildren(context, ancestors);
    ancestors.pop();
    // console.log("----- clear endTag -----", element.tag, context.source);
    // 清除结束节点
    if (startsWithEndTagOpen(context.source, element.tag)) {
        parseTag(context, 1 /* TagType.End */);
    }
    else {
        throw new Error(`缺少结束标签:${element.tag}`);
    }
    // console.log("-----parseElement context.source-----", context.source);
    return element;
}
function startsWithEndTagOpen(source, tag) {
    return (source.startsWith("</") &&
        source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase());
}
// 解析 <div></div>
function parseTag(context, type) {
    // 匹配 <[a-z] | </[a-z]
    const match = /^<\/?([a-z]*)/i.exec(context.source);
    const tag = match[1];
    // 清除处理完成的代码 context.source
    advanceBy(context, match[0].length);
    advanceBy(context, 1);
    if (type === 1 /* TagType.End */)
        return;
    return {
        type: 2 /* NodeTypes.ELEMENT */,
        tag: tag,
    };
}
// 解析插值 {{xxx}} 表达式
function parseInterpolation(context) {
    const openDelimiter = "{{";
    const closeDelimiter = "}}";
    const closeIndex = context.source.indexOf(closeDelimiter, openDelimiter.length);
    // 获取代表式 xxx 的长度
    const rawContentLength = closeIndex - openDelimiter.length;
    // 获取 xxx}}
    advanceBy(context, openDelimiter.length);
    // 获取 xxx 并且清除处理完成的 xxx
    const rawContent = parseTextData(context, rawContentLength);
    const content = rawContent.trim();
    // 此时 context.source = "}}" 清除 context.source = ""
    advanceBy(context, closeDelimiter.length);
    // console.log("-----parseInterpolation context.source-----", context.source);
    return {
        type: 0 /* NodeTypes.INTERPOLATION */,
        content: {
            type: 1 /* NodeTypes.SIMPLE_EXPRESSION */,
            content: content,
        },
    };
}
function advanceBy(context, length) {
    context.source = context.source.slice(length);
}
function createRoot(children) {
    return {
        children,
        type: 4 /* NodeTypes.ROOT */,
    };
}
function createParserContext(content) {
    return {
        source: content,
    };
}

function transform(root, options = {}) {
    const context = createTransformContext(root, options);
    // 遍历 - 深度优先搜索
    traverseNode(root, context);
    createRootCodegen(root);
    root.helpers = [...context.helpers.keys()];
}
function createRootCodegen(root) {
    const child = root.children[0];
    if (child.type === 2 /* NodeTypes.ELEMENT */) {
        root.codegenNode = child.codegenNode;
    }
    else {
        root.codegenNode = child;
    }
}
function traverseNode(node, context) {
    const nodeTransforms = context.nodeTransforms;
    const exitFns = [];
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i];
        const onExit = transform(node, context);
        if (onExit)
            exitFns.push(onExit);
    }
    switch (node.type) {
        case 0 /* NodeTypes.INTERPOLATION */:
            context.helper(TO_DISPLAY_STRING);
            break;
        case 4 /* NodeTypes.ROOT */:
        case 2 /* NodeTypes.ELEMENT */:
            traversChildren(node, context);
    }
    console.log(node);
    let i = exitFns.length;
    while (i--) {
        exitFns[i]();
    }
}
function traversChildren(node, context) {
    const children = node.children;
    if (children) {
        for (let i = 0; i < children.length; i++) {
            const node = children[i];
            traverseNode(node, context);
        }
    }
}
function createTransformContext(root, options) {
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || [],
        helpers: new Map(),
        helper(key) {
            context.helpers.set(key, 1);
        },
    };
    return context;
}

function isText(node) {
    return node.type === 3 /* NodeTypes.TEXT */ || node.type === 0 /* NodeTypes.INTERPOLATION */;
}

function transformText(node, context) {
    if (node.type === 2 /* NodeTypes.ELEMENT */) {
        return () => {
            const { children } = node;
            let currentContainer;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (isText(child)) {
                    for (let j = i + 1; j < children.length; j++) {
                        const nextChild = children[j];
                        if (isText(nextChild)) {
                            if (!currentContainer) {
                                currentContainer = children[i] = {
                                    type: 5 /* NodeTypes.COMPOUND_EXPRESSION */,
                                    children: [child],
                                };
                            }
                            currentContainer.children.push(" + ");
                            currentContainer.children.push(nextChild);
                            children.splice(j, 1);
                            j--;
                        }
                        else {
                            currentContainer = undefined;
                            break;
                        }
                    }
                }
            }
        };
    }
}

function createVNode(context, tag, props, children) {
    context.helper(CREATE_ELEMENT_VNODE);
    return {
        type: 2 /* NodeTypes.ELEMENT */,
        tag,
        props,
        children,
    };
}

function transformElement(node, context) {
    if (node.type === 2 /* NodeTypes.ELEMENT */) {
        return () => {
            // 处理中间层
            // tag
            const vnodeTag = `'${node.tag}'`;
            // props
            let vnodeProps;
            // children
            const children = node.children;
            let vnodeChildren = children[0];
            node.codegenNode = createVNode(context, vnodeTag, vnodeProps, vnodeChildren);
        };
    }
}

function transformExpression(node) {
    if (node.type === 0 /* NodeTypes.INTERPOLATION */) {
        node.content = processExpression(node.content);
    }
}
function processExpression(node) {
    node.content = `_ctx.${node.content}`;
    return node;
}

function baseCompile(template) {
    const ast = baseParse(template);
    transform(ast, {
        nodeTransforms: [transformExpression, transformElement, transformText],
    });
    return generate(ast);
}

// mini-vue 出口
/**
 * 将 template 编译成 render 函数
 */
function compileToFunction(template) {
    const { code } = baseCompile(template);
    /**
     * 因为 render 需要调用 runtime-dom 中的方法
     * 所以将 runtime-dom 做为参数对象传递给这个函数
     */
    const render = new Function("Vue", code)(runtimeDom);
    return render;
}
// 将 compile-core 生成的 render 函数传递给 runtime-core
registerRuntimeCompiler(compileToFunction);

exports.ReactiveEffect = ReactiveEffect;
exports.createApp = createApp;
exports.createElementVNode = createVNode$1;
exports.createRenderer = createRenderer;
exports.createTextVNode = createTextVNode;
exports.effect = effect;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.isProxy = isProxy;
exports.isReactive = isReactive;
exports.isReadonly = isReadonly;
exports.isRef = isRef;
exports.nextTick = nextTick;
exports.provide = provide;
exports.proxyRefs = proxyRefs;
exports.reactive = reactive;
exports.readonly = readonly;
exports.ref = ref;
exports.registerRuntimeCompiler = registerRuntimeCompiler;
exports.renderSlots = renderSlots;
exports.shallowReadonly = shallowReadonly;
exports.stop = stop;
exports.toDisplayString = toDisplayString;
exports.unRef = unRef;
