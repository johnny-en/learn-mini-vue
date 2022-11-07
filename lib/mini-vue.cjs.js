'use strict';

const extend = Object.assign;
const EMPTY_OBJ = {};
const isObject = (value) => value !== null && typeof value === "object";
const hasChange = (value, newValue) => {
    return !Object.is(value, newValue);
};
const isOn = (value) => /^on[A-Z]/.test(value);
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
function currentInstance() {
    return currentInstance_data;
}
function setCurrentInstance(value) {
    currentInstance_data = value;
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
    if (Component.render) {
        instance.render = Component.render;
    }
}
function getCurrentInstance() {
    return currentInstance();
}

const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        el: null,
        key: props && props.key,
        shapeFlag: shapeFlag(type),
    };
    setChildrenShapeFlag(vnode);
    setSlotsShapeFlag(vnode);
    return vnode;
}
function createTextVNode(text) {
    return createVNode(Text, {}, text);
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
                const vnode = createVNode(rootComponent);
                render(vnode, rootContainer);
            },
        };
    };
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
        console.log("n1", n1);
        console.log("n2", n2);
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
             **/
            let s1 = i;
            let s2 = i;
            let patched = 0;
            const toBePatched = e2 - s2 + 1;
            const keyToNewIndexMap = new Map();
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
                    patch(prevChild, c2[newIndex], container, parentComponent, null);
                    patched++;
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
        mountComponent(n2, container, parentComponent, anchor);
    }
    function mountComponent(vnode, container, parentComponent, anchor) {
        const instance = createComponentInstance(vnode, parentComponent);
        setupComponent(instance);
        setupRenderEffect(instance, vnode, container, anchor);
    }
    function setupRenderEffect(instance, initialVNode, container, anchor) {
        /**
         * 使用 effect 包裹是因为要在这里做依赖收集操作
         * 因组件 render 函数中的响应对象的 get 操作被触发时，会触发依赖收集
         * 响应对象数据更新时，会触发收集的依赖
         */
        effect(() => {
            if (!instance.isMounted) {
                // 组件初始化
                const subTree = (instance.subTree = instance.render.call(instance.proxy));
                console.log("init", subTree);
                patch(null, subTree, container, instance, anchor);
                // 当前根元素虚拟节点 el -> 当前组件虚拟节点 el 上
                initialVNode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                // 组件更新
                console.log("update");
                const subTree = instance.render.call(instance.proxy);
                const prevSubTree = instance.subTree;
                instance.subTree = subTree;
                patch(prevSubTree, subTree, container, instance, anchor);
            }
        });
    }
    return {
        createApp: createAppAPI(render),
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        if (typeof slot === "function") {
            return createVNode(Fragment, {}, slot(props));
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

exports.createApp = createApp;
exports.createRenderer = createRenderer;
exports.createTextVNode = createTextVNode;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.provide = provide;
exports.proxyRefs = proxyRefs;
exports.reactive = reactive;
exports.readonly = readonly;
exports.ref = ref;
exports.renderSlots = renderSlots;
