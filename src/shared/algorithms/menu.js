// 统一“当天”标识，确保菜单按自然日复用。
export function todayKey() {
  return new Date().toLocaleDateString('zh-CN')
}

// Fisher-Yates 洗牌后截断，用于无约束场景的随机抽样。
export function pickRandomItems(list, count) {
  const copy = [...list]

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }

  return copy.slice(0, Math.min(count, copy.length))
}

// 支持中英文逗号和空白分隔，输出干净标签数组。
export function normalizeTags(text) {
  return text
    .split(/[，,\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
}
