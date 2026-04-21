import { pickRandomItems } from './menu'

const DEFAULT_TARGET_CALORIES_PER_DISH = 320

// 兜底热量：当菜品热量缺失或异常时，用统一值参与热量排序。
function toSafeCalories(value) {
  const calories = Number(value)
  return Number.isFinite(calories) && calories > 0 ? calories : DEFAULT_TARGET_CALORIES_PER_DISH
}

function getCategoryPool(dishes, category) {
  return dishes.filter((dish) => dish.category === category)
}

function getTemperaturePool(dishes, servingTemperature) {
  return dishes.filter((dish) => dish.servingTemperature === servingTemperature)
}

function takeOne(pool, selectedIds) {
  const candidates = pool.filter((dish) => !selectedIds.has(dish.id))

  if (!candidates.length) {
    return null
  }

  return candidates[Math.floor(Math.random() * candidates.length)]
}

function sortByCaloriesGap(dishes, targetAverage) {
  return [...dishes].sort((left, right) => {
    const leftGap = Math.abs(toSafeCalories(left.calories) - targetAverage)
    const rightGap = Math.abs(toSafeCalories(right.calories) - targetAverage)
    return leftGap - rightGap
  })
}

export function generateBalancedMenu(dishes, count, options = {}) {
  if (!Array.isArray(dishes) || !dishes.length) {
    return []
  }

  // 规范入参：至少选 1 道，且不超过可用菜品总数。
  const safeCount = Math.max(1, Math.min(Number(count) || 1, dishes.length))
  const targetAverageCalories = Math.max(120, Number(options.targetAverageCalories) || DEFAULT_TARGET_CALORIES_PER_DISH)
  const selected = []
  const selectedIds = new Set()
  const meatPool = getCategoryPool(dishes, '荤菜')
  const vegPool = getCategoryPool(dishes, '素菜')
  const coldPool = getTemperaturePool(dishes, '冷菜')
  const hotPool = getTemperaturePool(dishes, '热菜')

  const mustHavePools = []

  if (meatPool.length && vegPool.length && safeCount >= 2) {
    mustHavePools.push(meatPool, vegPool)
  }

  if (coldPool.length && hotPool.length && safeCount >= 2) {
    mustHavePools.push(coldPool, hotPool)
  }

  // 第一阶段：优先满足“结构平衡”（荤素/冷热）。
  mustHavePools.forEach((pool) => {
    if (selected.length >= safeCount) {
      return
    }

    const picked = takeOne(pool, selectedIds)
    if (!picked) {
      return
    }

    selected.push(picked)
    selectedIds.add(picked.id)
  })

  if (selected.length >= safeCount) {
    return selected.slice(0, safeCount)
  }

  // 第二阶段：按目标热量接近程度补齐，控制整体热量波动。
  const remaining = dishes.filter((dish) => !selectedIds.has(dish.id))
  const byCalories = sortByCaloriesGap(remaining, targetAverageCalories)

  byCalories.forEach((dish) => {
    if (selected.length < safeCount) {
      selected.push(dish)
      selectedIds.add(dish.id)
    }
  })

  if (selected.length < safeCount) {
    // 第三阶段兜底：在极端数据下仍保证返回固定数量菜品。
    const fallback = pickRandomItems(
      dishes.filter((dish) => !selectedIds.has(dish.id)),
      safeCount - selected.length,
    )
    selected.push(...fallback)
  }

  return selected
}
