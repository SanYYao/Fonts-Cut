---

---

# SanYYao Fonts Hub

> 个人私有字体分发中心 (Serverless + R2)
> 
> 字体资产托管于 R2，索引文件托管于 GitHub。

---

## ⚡️ 基本用法 (快速上手)

想要一次性引入所有字体的最新版 `latest`，直接使用全局索引：

- **HTML** 方式：

```html
<link rel="stylesheet" href="[https://fonts.sanyyao.com/index.css](https://fonts.sanyyao.com/index.css)">
```

- **CSS** 方式：

```css
@import url('[https://fonts.sanyyao.com/index.css](https://fonts.sanyyao.com/index.css)');

/* 使用示例 */
body {
  font-family: 'Dymon-ShouXieTi', sans-serif;
}
```

---

## 📥 资源列表

- **最新全量索引文件**: [index.css](https://fonts.sanyyao.com/index.css) *(点击查看当前收录的所有字体及引用路径)*

---

## 🛠 详细用法

### 1. 指定字体版本号 (锁定版本)

如果你需要确保 UI 稳定性，或者偏爱某个旧版本的字形，不要使用 `index.css`，请单独引入该版本的 CSS：

```css
/* 格式: /家族名/版本号/result.css */
@import url('[https://fonts.sanyyao.com/Dymon-ShouXieTi/v1.0/result.css](https://fonts.sanyyao.com/Dymon-ShouXieTi/v1.0/result.css)');
```

### 2. 指定字体文件 (手动模式)

如果不想引入整个 CSS，或者在非 Web 环境（如小程序/Canvas）需要直接加载字体文件，路径规则如下：

- **URL 规则**: `https://fonts.sanyyao.com/{家族名}/{版本}/{切片名}.woff2`

- *注意：由于使用了分片技术，建议优先使用上面的 CSS 方式引入，否则你需要手动处理几百个切片文件的加载逻辑。*



---



### index.css

```css
/* SanYYao Fonts Hub - Full Index */
/* Generated at: 2026/1/14 18:01:09 */
/* Hosted on GitHub, Assets served from R2 */


/* --- BBHBartle-Regular --- */
@import url('https://fonts.sanyyao.com/BBHBartle-Regular/latest/result.css');
@import url('https://fonts.sanyyao.com/BBHBartle-Regular/v1.0/result.css');

/* --- BBHHegarty-Regular --- */
@import url('https://fonts.sanyyao.com/BBHHegarty-Regular/latest/result.css');
@import url('https://fonts.sanyyao.com/BBHHegarty-Regular/v1.0/result.css');

/* --- Dymon-ShouXieTi --- */
@import url('https://fonts.sanyyao.com/Dymon-ShouXieTi/latest/result.css');
@import url('https://fonts.sanyyao.com/Dymon-ShouXieTi/v2.2/result.css');

/* --- Jiying-Huipianheyuan --- */
@import url('https://fonts.sanyyao.com/Jiying-Huipianheyuan/latest/result.css');
@import url('https://fonts.sanyyao.com/Jiying-Huipianheyuan/v1.02/result.css');
@import url('https://fonts.sanyyao.com/Jiying-Huipianheyuan/v1.03/result.css');

/* --- KodeMono --- */
@import url('https://fonts.sanyyao.com/KodeMono/latest/result.css');
@import url('https://fonts.sanyyao.com/KodeMono/v1.206/result.css');

/* --- Tangyuan --- */
@import url('https://fonts.sanyyao.com/Tangyuan/latest/result.css');
@import url('https://fonts.sanyyao.com/Tangyuan/v0.12/result.css');

```


