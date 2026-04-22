import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { defaultDishes } from '../data/defaultDishes'
import { normalizeHistoricalDish } from '../shared/algorithms/dishProfile'
import { normalizeTags, todayKey } from '../shared/algorithms/menu'
import { generateBalancedMenu } from '../shared/algorithms/menuPlanner'
import { loadLunchState, saveDailyMenu, saveDishes, saveMenuCount, saveMenuHistory, loadMenuHistory } from '../shared/storage/lunchDb'

const LunchContext = createContext(null)

export function LunchProvider({ children }) {
  const [dishes, setDishes] = useState(defaultDishes)
  const [menuCount, setMenuCount] = useState(3)
  const [dailyMenu, setDailyMenu] = useState({
    date: todayKey(),
    items: generateBalancedMenu(defaultDishes, 3),
  })
  const [menuHistory, setMenuHistory] = useState([])
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function hydrateState() {
      const fallbackState = {
        dishes: defaultDishes,
        dailyMenu: {
          date: todayKey(),
          items: generateBalancedMenu(defaultDishes, 3),
        },
        menuCount: 3,
      }

      try {
        const storedState = await loadLunchState(fallbackState)
        const nextDishes = (storedState.dishes.length ? storedState.dishes : defaultDishes).map(normalizeHistoricalDish)
        const nextMenuCount = storedState.menuCount || 3
        let nextDailyMenu = {
          ...storedState.dailyMenu,
          items: (storedState.dailyMenu.items || []).map(normalizeHistoricalDish),
        }
        const nextMenuHistory = (await loadMenuHistory()) || []

        if (nextDailyMenu.date !== todayKey()) {
          nextDailyMenu = {
            date: todayKey(),
            items: generateBalancedMenu(nextDishes, nextMenuCount),
          }
        }

        if (!cancelled) {
          setDishes(nextDishes)
          setMenuCount(nextMenuCount)
          setDailyMenu(nextDailyMenu)
          setMenuHistory(nextMenuHistory)
          setIsReady(true)
        }
      } catch {
        if (!cancelled) {
          setIsReady(true)
        }
      }
    }

    hydrateState()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isReady) {
      return
    }

    saveDishes(dishes)
  }, [dishes, isReady])

  useEffect(() => {
    if (!isReady) {
      return
    }

    if (dailyMenu.date !== todayKey()) {
      setDailyMenu({
        date: todayKey(),
        items: generateBalancedMenu(dishes, menuCount),
      })
      return
    }

    if (!dailyMenu.items.length && dishes.length) {
      setDailyMenu({
        date: todayKey(),
        items: generateBalancedMenu(dishes, menuCount),
      })
    }
  }, [dailyMenu.date, dailyMenu.items.length, dishes, isReady, menuCount])

  useEffect(() => {
    if (!isReady) {
      return
    }

    saveDailyMenu(dailyMenu)
  }, [dailyMenu, isReady])

  useEffect(() => {
    if (!isReady) {
      return
    }

    saveMenuCount(menuCount)
  }, [isReady, menuCount])

  const categories = useMemo(
    () => ['全部', ...new Set(dishes.map((dish) => dish.category).filter(Boolean))],
    [dishes],
  )

  const stats = useMemo(
    () => ({
      total: dishes.length,
      categories: Math.max(categories.length - 1, 0),
      quick: dishes.filter((dish) => dish.tags.includes('快手')).length,
    }),
    [categories.length, dishes],
  )

  function addDish(values) {
    const nextTags = Array.isArray(values.tags) ? values.tags : normalizeTags(values.tags || '')
    const nextDish = {
      id: crypto.randomUUID(),
      name: values.name.trim(),
      calories: Number(values.calories) || 300,
      category: values.category.trim() || '未分类',
      servingTemperature: values.servingTemperature || '热菜',
      tags: nextTags,
    }

    setDishes((current) => [nextDish, ...current])
  }

  function removeDish(id) {
    setDishes((current) => current.filter((dish) => dish.id !== id))
    setDailyMenu((current) => ({
      ...current,
      items: current.items.filter((dish) => dish.id !== id),
    }))
  }

  function generateMenu(force = false) {
    if (!dishes.length) {
      setDailyMenu({ date: todayKey(), items: [] })
      return
    }

    if (!force && dailyMenu.date === todayKey() && dailyMenu.items.length) {
      return
    }

    const newMenu = {
      date: todayKey(),
      items: generateBalancedMenu(dishes, menuCount),
    }

    setDailyMenu(newMenu)

    // 保存历史记录（保留最近 10 条）
    const newHistory = {
      id: crypto.randomUUID(),
      date: todayKey(),
      items: newMenu.items,
      menuCount,
      createdAt: new Date().toISOString(),
    }
    const updatedHistory = [newHistory, ...menuHistory].slice(0, 10)
    setMenuHistory(updatedHistory)
    saveMenuHistory(updatedHistory)
  }

  function resetLibrary() {
    setDishes(defaultDishes)
    setDailyMenu({
      date: todayKey(),
      items: generateBalancedMenu(defaultDishes, menuCount),
    })
  }

  function replaceDishes(nextDishes) {
    const normalizedDishes = nextDishes.map(normalizeHistoricalDish)

    setDishes(normalizedDishes)
    setDailyMenu({
      date: todayKey(),
      items: generateBalancedMenu(normalizedDishes, menuCount),
    })
  }

  const value = {
    categories,
    dailyMenu,
    dishes,
    isReady,
    menuCount,
    menuHistory,
    stats,
    addDish,
    generateMenu,
    removeDish,
    replaceDishes,
    resetLibrary,
    setMenuCount,
    todayKey,
  }

  return <LunchContext.Provider value={value}>{children}</LunchContext.Provider>
}

export function useLunch() {
  const context = useContext(LunchContext)

  if (!context) {
    throw new Error('useLunch must be used within LunchProvider')
  }

  return context
}
