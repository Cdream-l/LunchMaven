export function todayKey() {
  return new Date().toLocaleDateString('zh-CN')
}

export function pickRandomItems(list, count) {
  const copy = [...list]

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }

  return copy.slice(0, Math.min(count, copy.length))
}

export function normalizeTags(text) {
  return text
    .split(/[，,\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
}
