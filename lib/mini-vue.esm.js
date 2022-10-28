const extend = Object.assign;
const isObject = (value) => value !== null && typeof value === "object";
const isOn = (value) => /^on[A-Z]/.test(value);
const hasOwn = (target, key) => Object.prototype.hasOwnProperty.call(target, key);
// add -> Add
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
// add -> onAdd
const toHandlerKey = (str) => str ? "on" + capitalize(str) : "";
// add-foo -> addFoo
const camelize = (str) => str.replace(/-(\w)/g, (_, s) => (s ? s.toUpperCase() : ""));

const targetMap_data = new Map();
function targetMap() {
    return targetMap_data;
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

function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        slots: {},
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
        // 只是首层 props 只读不可修改
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit,
        });
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    /**
     * setupResult: function | object
     * function -> component render
     * object -> inject component
     * */
    if (typeof setupResult === "object") {
        instance.setupState = setupResult;
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    if (Component.render) {
        instance.render = Component.render;
    }
}

function render(vnode, container) {
    // 调用 patch 方法
    patch(vnode, container);
}
function patch(vnode, container) {
    if (vnode.shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
        // if vnode -> element -> 处理 element
        processElement(vnode, container);
    }
    else if (vnode.shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
        // if vnode -> 组件 -> 处理组件
        processComponent(vnode, container);
    }
}
function processElement(vnode, container) {
    mountElement(vnode, container);
}
function mountElement(vnode, container) {
    const el = (vnode.el = document.createElement(vnode.type));
    // 处理 children: string | array
    const { children, shapeFlag } = vnode;
    if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
        el.textContent = children;
    }
    else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
        mountChildren(children, el);
    }
    // 处理 props
    const { props } = vnode;
    for (const key in props) {
        const value = props[key];
        if (isOn(key)) {
            const event = key.slice(2).toLowerCase();
            el.addEventListener(event, value);
        }
        else {
            el.setAttribute(key, value);
        }
    }
    container.append(el);
}
function mountChildren(children, container) {
    children.forEach((vnode) => {
        patch(vnode, container);
    });
}
function processComponent(vnode, container) {
    mountComponent(vnode, container);
}
function mountComponent(initialVNode, container) {
    const instance = createComponentInstance(initialVNode);
    setupComponent(instance);
    setupRenderEffect(instance, initialVNode, container);
}
function setupRenderEffect(instance, initialVNode, container) {
    const subTree = instance.render.call(instance.proxy);
    patch(subTree, container);
    // 当前根元素虚拟节点 el -> 当前组件虚拟节点 el 上
    initialVNode.el = subTree.el;
}

function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        el: null,
        shapeFlag: shapeFlag(type),
    };
    setChildrenShapeFlag(vnode);
    setSlotsShapeFlag(vnode);
    return vnode;
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

function createApp(rootComponent) {
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
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        if (typeof slot === "function") {
            return createVNode("div", {}, slot(props));
        }
    }
}

export { createApp, h, renderSlots };
