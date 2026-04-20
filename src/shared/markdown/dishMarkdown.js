import { normalizeHistoricalDish } from '../algorithms/dishProfile'

function escapeCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').trim()
}

function unescapeCell(value) {
  return value.replace(/\\\|/g, '|').trim()
}

function splitMarkdownRow(line) {
  const trimmed = line.trim()

  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
    return null
  }

  const content = trimmed.slice(1, -1)
  const cells = []
  let current = ''
  let escaped = false

  for (const char of content) {
    if (escaped) {
      current += char
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (char === '|') {
      cells.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  cells.push(current.trim())
  return cells
}

function isDividerRow(cells) {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell))
}

export function serializeDishesToMarkdown(dishes) {
  const lines = [
    '# Lunch Maven 菜品库',
    '',
    '可直接批量编辑下表后再导入项目。标签请用英文逗号分隔。',
    '',
    '| 菜品名称 | 分类 | 食用温度 | 热量(kcal) | 标签 |',
    '| --- | --- | --- | --- | --- |',
  ]

  dishes.forEach((dish) => {
    lines.push(
      `| ${escapeCell(dish.name)} | ${escapeCell(dish.category)} | ${escapeCell(dish.servingTemperature)} | ${escapeCell(dish.calories)} | ${escapeCell((dish.tags || []).join(', '))} |`,
    )
  })

  return lines.join('\n')
}

export function parseDishesMarkdown(markdown) {
  const rows = markdown
    .split(/\r?\n/)
    .map(splitMarkdownRow)
    .filter(Boolean)

  if (rows.length < 2) {
    throw new Error('未找到可导入的 Markdown 表格')
  }

  const header = rows[0].map(unescapeCell)
  const expectedHeader = ['菜品名称', '分类', '食用温度', '热量(kcal)', '标签']

  if (header.join('|') !== expectedHeader.join('|')) {
    throw new Error('Markdown 表头不匹配，请使用导出的模板进行编辑')
  }

  const dataRows = rows.slice(1).filter((cells) => !isDividerRow(cells))

  if (!dataRows.length) {
    throw new Error('Markdown 中没有可导入的菜品数据')
  }

  return dataRows
    .map((cells) => {
      const [name, category, servingTemperature, calories, tags] = cells.map(unescapeCell)

      return normalizeHistoricalDish({
        id: crypto.randomUUID(),
        name,
        category,
        servingTemperature,
        calories: Number(calories),
        tags: tags
          ? tags
              .split(/[，,]+/)
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
      })
    })
    .filter((dish) => dish.name)
}
