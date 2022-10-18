### `vue3` 的响应式过程 
<img src="./imgs/实现%20effect%20&%20reactive%20&%20依赖收集%20&%20触发依赖.png"/>

1. 声明响应式数据
```js
  const user = reactive({
    age: 10,
  });
```
2. 执行 `effect` 
```js
  effect(() => {
    let nextAge = user.age + 1;
  });
```
3. 依赖收集
   
   执行 `effect`，当接收的函数中获取响应式数据会进行依赖收集

4. 触发依赖
   
   当响应式数据更新后会触发依赖，再次执行 `effect` 中的函数

  ```js
    
    user.age++

  ```
