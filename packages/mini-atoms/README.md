# @theia/mini-atoms

Mini Atoms 在左侧面板提供「Browser Preview」，用于展示从右侧 AI Chat 生成的单文件 HTML 应用。  
要让生成的页面在 Mini Atoms 中正确呈现，需要 **Chat 回复的格式** 与解析逻辑配合。

## 如何配合才能让 Mini Atoms 呈现效果

### 1. 回复中必须包含 HTML 代码块

Mini Atoms 只会从 **Markdown 代码块** 里抽取 HTML 并渲染到左侧预览。代码块需满足：

- 使用 **\`\`\`html** 或 **\`\`\`HTML** 作为开始标记（语言标识可选，但建议写上 `html` 便于解析）。
- 代码块内容为 **完整、可单独运行的 HTML**（可含内联 CSS/JS）。
- 以 **\`\`\`** 正确结束代码块。

示例（AI 回复中应包含类似内容）：先写一段说明文字，再跟一个以「\`\`\`html」开头、以「\`\`\`」结尾的代码块，代码块内为完整 HTML，例如：

    Here is your app:

    ```html
    <!DOCTYPE html>
    <html>
    <head><title>Demo</title></head>
    <body><h1>Hello</h1></body>
    </html>
    ```

解析逻辑会取 **第一个** 匹配的「\`\`\`html ... \`\`\`」块，将其中的 HTML 注入左侧 iframe 的 `srcDoc` 中展示。

### 2. 在 Prompt / Agent 中约定输出格式

若希望每次生成都能在 Mini Atoms 中展示，需要在 **用户提示词** 或 **Agent 系统说明** 中明确要求「只输出一个 HTML 代码块」。

- **代码中可用的常量**：`MINI_ATOMS_HTML_OUTPUT_INSTRUCTION`（在 `@theia/mini-atoms` 的 `code-extractor` 中导出），可直接拼进提示词或 agent 指令。
- **示例提示后缀**（与 `mini-atoms-generate-service` 中一致）：
  - 前缀：`Generate a single-file HTML application (with inline CSS and JavaScript) that does the following. `
  - 后缀：`Reply with only one markdown code block containing the full HTML document, starting with ```html and ending with ```.`

这样模型会稳定输出「\`\`\`html ... \`\`\`」代码块，Mini Atoms 的 `extractHTML` 才能解析并在左侧呈现效果。

### 3. 数据流简述

1. 用户在右侧 **AI Chat** 发送请求（例如「生成一个 xxx 的页面」）。
2. Chat 回复完成后，**MiniAtomsChatIntegration** 监听 `ChatModel.onDidChange`（`addRequest`），在对应 **response 完成** 时取 `response.response.asString()` 得到完整回复文本。
3. 使用 **extractHTML(text)** 从文本中抽取第一个 \`\`\`html ... \`\`\` 块内容。
4. 若有抽取结果，则调用 **MiniAtomsWidget.setPreviewHtml(html)**，并在左侧 iframe 中通过 `srcDoc` 渲染；同时会写入 **MiniAtomsStorageService** 的当前项与历史。

因此：**只要 Chat 的最终回复字符串里包含符合上述格式的 HTML 代码块，Mini Atoms 就会自动在左侧呈现效果。** 配合要点就是：**在 prompt 或 agent 中约定「只输出一个 \`\`\`html ... \`\`\` 代码块」**，并可复用 `MINI_ATOMS_HTML_OUTPUT_INSTRUCTION` 或与 `mini-atoms-generate-service` 相同的后缀。
