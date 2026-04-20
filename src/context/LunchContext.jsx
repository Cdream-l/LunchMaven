import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { defaultDishes } from '../data/defaultDishes'
import { normalizeHistoricalDish } from '../shared/algorithms/dishProfile'
import { normalizeTags, pickRandomItems, todayKey } from '../shared/algorithms/menu'
import { loadLunchState, saveDailyMenu, saveDishes, saveMenuCount } from '../shared/storage/lunchDb'

const LunchContext = createContext(null)

export function LunchProvider({ children }) {
  const [dishes, setDishes] = useState(defaultDishes)
  const [menuCount, setMenuCount] = useState(3)
  const [dailyMenu, setDailyMenu] = useState({
    date: todayKey(),
    items: pickRandomItems(defaultDishes, 3),
  })
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function hydrateState() {
      const fallbackState = {
        dishes: defaultDishes,
        dailyMenu: {
          date: todayKey(),
          items: pickRandomItems(defaultDishes, 3),
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

        if (nextDailyMenu.date !== todayKey()) {
          nextDailyMenu = {
            date: todayKey(),
            items: pickRandomItems(nextDishes, nextMenuCount),
          }
        }

        if (!cancelled) {
          setDishes(nextDishes)
          setMenuCount(nextMenuCount)
          setDailyMenu(nextDailyMenu)
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
        items: pickRandomItems(dishes, menuCount),
      })
      return
    }

    if (!dailyMenu.items.length && dishes.length) {
      setDailyMenu({
        date: todayKey(),
        items: pickRandomItems(dishes, menuCount),
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

    setDailyMenu({
      date: todayKey(),
      items: pickRandomItems(dishes, menuCount),
    })
  }

  function resetLibrary() {
    setDishes(defaultDishes)
    setDailyMenu({
      date: todayKey(),
      items: pickRandomItems(defaultDishes, menuCount),
    })
  }

  function replaceDishes(nextDishes) {
    const normalizedDishes = nextDishes.map(normalizeHistoricalDish)

    setDishes(normalizedDishes)
    setDailyMenu({
      date: todayKey(),
      items: pickRandomItems(normalizedDishes, menuCount),
    })
  }

  const value = {
    categories,
    dailyMenu,
    dishes,
    isReady,
    menuCount,
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
