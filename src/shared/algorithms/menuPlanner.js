import { pickRandomItems } from './menu'

const DEFAULT_TARGET_CALORIES_PER_DISH = 320

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

  const remaining = dishes.filter((dish) => !selectedIds.has(dish.id))
  const byCalories = sortByCaloriesGap(remaining, targetAverageCalories)

  byCalories.forEach((dish) => {
    if (selected.length < safeCount) {
      selected.push(dish)
      selectedIds.add(dish.id)
    }
  })

  if (selected.length < safeCount) {
    const fallback = pickRandomItems(
      dishes.filter((dish) => !selectedIds.has(dish.id)),
      safeCount - selected.length,
    )
    selected.push(...fallback)
  }

  return selected
}
