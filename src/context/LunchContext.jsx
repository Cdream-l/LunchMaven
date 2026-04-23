import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_DISH_LIBRARY_VERSION, defaultDishes, LEGACY_SEED_DISH_IDS } from '../data/defaultDishes'
import { normalizeHistoricalDish } from '../shared/algorithms/dishProfile'
import { normalizeTags, todayKey } from '../shared/algorithms/menu'
import { analyzeMenuRequest, generateBalancedMenu } from '../shared/algorithms/menuPlanner'
import {
  saveDishLibraryVersion,
  loadLunchState,
  loadMenuHistory,
  saveDailyMenu,
  saveDishes,
  saveMenuCount,
  saveMenuHistory,
  saveMenuRequest,
} from '../shared/storage/lunchDb'

const LunchContext = createContext(null)

function shouldUpgradeSeedLibrary(storedDishes, storedVersion) {
  if (!Array.isArray(storedDishes) || storedVersion >= DEFAULT_DISH_LIBRARY_VERSION) {
    return false
  }

  if (storedDishes.length !== LEGACY_SEED_DISH_IDS.length) {
    return false
  }

  return storedDishes.every((dish, index) => dish?.id === LEGACY_SEED_DISH_IDS[index])
}

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
  const [dishLibraryVersion, setDishLibraryVersion] = useState(DEFAULT_DISH_LIBRARY_VERSION)
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
        dishLibraryVersion: DEFAULT_DISH_LIBRARY_VERSION,
      }

      try {
        const storedState = await loadLunchState(fallbackState)
        const shouldUpgrade = shouldUpgradeSeedLibrary(storedState.dishes, storedState.dishLibraryVersion)
        const sourceDishes = shouldUpgrade
          ? defaultDishes
          : storedState.dishes.length
            ? storedState.dishes
            : defaultDishes
        const nextDishes = sourceDishes.map(normalizeHistoricalDish)
        const nextMenuCount = storedState.menuCount || 3
        const nextMenuRequest = storedState.menuRequest || ''
        const nextDishLibraryVersion = shouldUpgrade
          ? DEFAULT_DISH_LIBRARY_VERSION
          : storedState.dishLibraryVersion || DEFAULT_DISH_LIBRARY_VERSION
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
          setDishLibraryVersion(nextDishLibraryVersion)
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

    saveDishLibraryVersion(dishLibraryVersion)
  }, [dishLibraryVersion, isReady])

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

  function updateDish(id, values) {
    const nextTags = Array.isArray(values.tags) ? values.tags : normalizeTags(values.tags || '')

    setDishes((current) =>
      current.map((dish) =>
        dish.id === id
          ? {
              ...dish,
              name: values.name.trim(),
              calories: Number(values.calories) || dish.calories || 300,
              category: values.category.trim() || '未分类',
              servingTemperature: values.servingTemperature || '热菜',
              tags: nextTags,
            }
          : dish,
      ),
    )
    setDailyMenu((current) => ({
      ...current,
      items: current.items.map((dish) =>
        dish.id === id
          ? {
              ...dish,
              name: values.name.trim(),
              calories: Number(values.calories) || dish.calories || 300,
              category: values.category.trim() || '未分类',
              servingTemperature: values.servingTemperature || '热菜',
              tags: nextTags,
            }
          : dish,
      ),
    }))
  }

  function removeDish(id) {
    setDishes((current) => current.filter((dish) => dish.id !== id))
    setDailyMenu((current) => ({
      ...current,
      items: current.items.filter((dish) => dish.id !== id),
    }))
  }

  function removeDishes(ids) {
    const targetIds = new Set(ids)

    if (!targetIds.size) {
      return
    }

    setDishes((current) => current.filter((dish) => !targetIds.has(dish.id)))
    setDailyMenu((current) => ({
      ...current,
      items: current.items.filter((dish) => !targetIds.has(dish.id)),
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
    setDishLibraryVersion(DEFAULT_DISH_LIBRARY_VERSION)
    setDailyMenu(buildDailyMenuPayload(defaultDishes, menuCount, menuRequest))
  }

  function replaceDishes(nextDishes) {
    const normalizedDishes = nextDishes.map(normalizeHistoricalDish)

    setDishes(normalizedDishes)
    setDishLibraryVersion(DEFAULT_DISH_LIBRARY_VERSION)
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
    removeDishes,
    updateDish,
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
