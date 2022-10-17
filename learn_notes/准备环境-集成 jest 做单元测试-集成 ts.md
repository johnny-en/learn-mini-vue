### 初始化
在项目的根目录生成 `package.json`

```bash
yarn init -y
```

### 安装 `TypeSciprt`
全局安装过 `TypeSciprt` 可以跳过这步

```bash
yarn add typescript --dev
```

### 项目初始化 `TypeSciprt`
在项目的根目录生成 `tsconfig.json`

```bash
npx tsc --init
```

### 安装 `jest`

```bash
yarn add jest @types/jest --dev

```

### 配置 `package.json`

```json
{
  ...
  "scripts":{
    "test":"jest"
  }
}
```

### 安装 `Babel`
使 `jest` 支持 `esm` 规范

```
yarn add babel-jest @babel/core @babel/preset-env --dev
```

### 使 `Babel` 支持 `TypeScript`
```
yarn add --dev @babel/preset-typescript
```

### 配置 `Babel`
在项目的根目录下创建 `babel.config.js`，通过配置 `Babel` 使其能够兼容当前的 `Node` 版本和支持 `TypeScript`
```js
module.exports = {
  presets: [
    ['@babel/preset-env', {targets: {node: 'current'}}],
    '@babel/preset-typescript',
  ],
};
```