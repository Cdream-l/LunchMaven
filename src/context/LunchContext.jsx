import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { defaultDishes } from '../data/defaultDishes'
import { normalizeHistoricalDish } from '../shared/algorithms/dishProfile'
import { normalizeTags, todayKey } from '../shared/algorithms/menu'
import { analyzeMenuRequest, generateBalancedMenu } from '../shared/algorithms/menuPlanner'
import {
  loadLunchState,
  loadMenuHistory,
  saveDailyMenu,
  saveDishes,
  saveMenuCount,
  saveMenuHistory,
  saveMenuRequest,
} from '../shared/storage/lunchDb'

const LunchContext = createContext(null)

function buildDailyMenuPayload(dishes, menuCount, requestText) {
  const requestAnalysis = analyzeMenuRequest(requestText, menuCount)

  return {
    date: todayKey(),
    items: generateBalancedMenu(dishes, menuCount, { requestText }),
    requestText,
    requestMeta: {
      hasQuantityIntent: requestAnalysis.hasQuantityIntent,
      requestedDishCount: requestAnalysis.requestedDishCount,
      summary: requestAnalysis.summary,
      selectorEnabled: requestAnalysis.selectorEnabled,
    },
  }
}

export function LunchProvider({ children }) {
  const [dishes, setDishes] = useState(defaultDishes)
  const [menuCount, setMenuCount] = useState(3)
  const [menuRequest, setMenuRequest] = useState('')
  const [dailyMenu, setDailyMenu] = useState(() => buildDailyMenuPayload(defaultDishes, 3, ''))
  const [menuHistory, setMenuHistory] = useState([])
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function hydrateState() {
      const fallbackState = {
        dishes: defaultDishes,
        dailyMenu: buildDailyMenuPayload(defaultDishes, 3, ''),
        menuCount: 3,
        menuRequest: '',
      }

      try {
        const storedState = await loadLunchState(fallbackState)
        const nextDishes = (storedState.dishes.length ? storedState.dishes : defaultDishes).map(normalizeHistoricalDish)
        const nextMenuCount = storedState.menuCount || 3
        const nextMenuRequest = storedState.menuRequest || ''
        let nextDailyMenu = {
          ...storedState.dailyMenu,
          items: (storedState.dailyMenu.items || []).map(normalizeHistoricalDish),
          requestText: storedState.dailyMenu.requestText ?? nextMenuRequest,
          requestMeta: storedState.dailyMenu.requestMeta ?? null,
        }
        const nextMenuHistory = (await loadMenuHistory()) || []

        if (nextDailyMenu.date !== todayKey()) {
          nextDailyMenu = buildDailyMenuPayload(nextDishes, nextMenuCount, nextMenuRequest)
        }

        if (!cancelled) {
          setDishes(nextDishes)
          setMenuCount(nextMenuCount)
          setMenuRequest(nextMenuRequest)
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
      setDailyMenu(buildDailyMenuPayload(dishes, menuCount, menuRequest))
      return
    }

    if (!dailyMenu.items.length && dishes.length) {
      setDailyMenu(buildDailyMenuPayload(dishes, menuCount, menuRequest))
    }
  }, [dailyMenu.date, dailyMenu.items.length, dishes, isReady, menuCount, menuRequest])

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

  useEffect(() => {
    if (!isReady) {
      return
    }

    saveMenuRequest(menuRequest)
  }, [isReady, menuRequest])

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

  const requestAnalysis = useMemo(() => analyzeMenuRequest(menuRequest, menuCount), [menuCount, menuRequest])

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
      setDailyMenu({ date: todayKey(), items: [], requestText: menuRequest, requestMeta: null })
      return
    }

    if (!force && dailyMenu.date === todayKey() && dailyMenu.items.length) {
      return
    }

    const newMenu = buildDailyMenuPayload(dishes, menuCount, menuRequest)
    setDailyMenu(newMenu)

    const newHistory = {
      id: crypto.randomUUID(),
      date: todayKey(),
      items: newMenu.items,
      menuCount,
      requestText: menuRequest,
      requestMeta: newMenu.requestMeta,
      createdAt: new Date().toISOString(),
    }
    const updatedHistory = [newHistory, ...menuHistory].slice(0, 10)
    setMenuHistory(updatedHistory)
    saveMenuHistory(updatedHistory)
  }

  function resetLibrary() {
    setDishes(defaultDishes)
    setDailyMenu(buildDailyMenuPayload(defaultDishes, menuCount, menuRequest))
  }

  function replaceDishes(nextDishes) {
    const normalizedDishes = nextDishes.map(normalizeHistoricalDish)

    setDishes(normalizedDishes)
    setDailyMenu(buildDailyMenuPayload(normalizedDishes, menuCount, menuRequest))
  }

  const value = {
    categories,
    dailyMenu,
    dishes,
    isReady,
    menuCount,
    menuHistory,
    menuRequest,
    requestAnalysis,
    stats,
    addDish,
    generateMenu,
    removeDish,
    replaceDishes,
    resetLibrary,
    setMenuCount,
    setMenuRequest,
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
