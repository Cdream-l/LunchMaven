import { pickRandomItems } from './menu'

const DEFAULT_TARGET_CALORIES_PER_DISH = 320
const REQUEST_NUMBER_PATTERN = '(\\d+|[一二两三四五六七八九十]+)'
const NEGATIVE_PREFIX_PATTERN = '(?:不吃|不要|别|忌口|忌|避开|不想吃|不考虑|不喝|不来|免|别来|不需要)'
const LIGHT_KEYWORDS = ['少油', '清淡', '低脂', '轻食', '减脂', '清爽']
const HEAVY_KEYWORDS = ['油炸', '红烧', '干锅', '回锅', '麻辣香锅', '炸', '煎', '辣子']
const LIGHT_DISH_KEYWORDS = ['清蒸', '白灼', '凉拌', '清炒', '蒸']
const SPICY_KEYWORDS = ['辣', '麻辣', '香辣', '川味', '辣子', '剁椒', '水煮', '小炒', '口味']
const SPICY_SAFE_HINTS = ['不辣', '微辣', '少辣']
const HEARTY_KEYWORDS = ['下饭', '浓一点', '重点口', '重口', '家常', '喷香', '香一点', '过瘾']

const HARD_EXCLUSION_RULES = [
  { key: 'noodle', label: '面条', aliases: ['面条', '面', '意面', '拉面', '刀削面', '乌冬', '米线', '河粉', '粉丝'] },
  { key: 'lamb', label: '羊肉', aliases: ['羊肉', '羊排', '羊杂', '羊'] },
  { key: 'beef', label: '牛肉', aliases: ['牛肉', '牛腩', '牛排', '牛'] },
  { key: 'pork', label: '猪肉', aliases: ['猪肉', '五花肉', '排骨', '里脊', '猪'] },
  { key: 'chicken', label: '鸡肉', aliases: ['鸡肉', '鸡翅', '鸡腿', '鸡胸', '鸡'] },
  { key: 'duck', label: '鸭肉', aliases: ['鸭肉', '鸭腿', '鸭血', '鸭'] },
  { key: 'fish', label: '鱼', aliases: ['鱼', '鲈鱼', '鲫鱼', '鳕鱼', '三文鱼'] },
  { key: 'shrimp', label: '虾', aliases: ['虾', '大虾', '虾仁'] },
]

const PEOPLE_SEGMENT_ALIASES = {
  adult: ['大人', '成人', '成年人', '男', '男人', '男生', '男性', '女', '女人', '女生', '女性', '女士', '夫妻', '两口子', '老公', '老婆'],
  child: ['小孩', '孩子', '小朋友', '宝宝', '儿童', '娃', '小童'],
  elder: ['老人', '长辈', '爸妈', '父母', '爷爷奶奶', '外公外婆', '老年人'],
}

function toSafeCalories(value) {
  const calories = Number(value)
  return Number.isFinite(calories) && calories > 0 ? calories : DEFAULT_TARGET_CALORIES_PER_DISH
}

function includesAny(text, words) {
  return words.some((word) => text.includes(word))
}

function getCategoryPool(dishes, category) {
  return dishes.filter((dish) => dish.category === category)
}

function getTemperaturePool(dishes, servingTemperature) {
  return dishes.filter((dish) => dish.servingTemperature === servingTemperature)
}

function parseChineseNumber(token) {
  const numeralMap = {
    零: 0,
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
  }

  if (!token) {
    return null
  }

  if (/^\d+$/.test(token)) {
    return Number(token)
  }

  if (token === '十') {
    return 10
  }

  if (token.startsWith('十')) {
    return 10 + (numeralMap[token[1]] || 0)
  }

  if (token.endsWith('十')) {
    return (numeralMap[token[0]] || 0) * 10
  }

  if (token.includes('十')) {
    const [tens, ones] = token.split('十')
    return (numeralMap[tens] || 0) * 10 + (numeralMap[ones] || 0)
  }

  return numeralMap[token] ?? null
}

function extractNumber(text, expression) {
  const matched = text.match(expression)
  return matched ? parseChineseNumber(matched[1]) : null
}

function extractPeopleCountFromSegment(text, aliases) {
  let total = 0

  aliases.forEach((alias) => {
    const regex = new RegExp(`(${REQUEST_NUMBER_PATTERN})${alias}`, 'g')
    let matched = regex.exec(text)

    while (matched) {
      total += parseChineseNumber(matched[1]) || 0
      matched = regex.exec(text)
    }
  })

  return total
}

function parseGroupedPeopleCount(text) {
  const adultCount = extractPeopleCountFromSegment(text, PEOPLE_SEGMENT_ALIASES.adult)
  const childCount = extractPeopleCountFromSegment(text, PEOPLE_SEGMENT_ALIASES.child)
  const elderCount = extractPeopleCountFromSegment(text, PEOPLE_SEGMENT_ALIASES.elder)
  const total = adultCount + childCount + elderCount

  if (!total) {
    return null
  }

  return {
    total,
    adultCount,
    childCount,
    elderCount,
  }
}

function deriveDishCountFromPeople(peopleCount, peopleBreakdown) {
  if (!peopleCount && !peopleBreakdown) {
    return null
  }

  const effectivePeopleCount = peopleBreakdown
    ? peopleBreakdown.adultCount + peopleBreakdown.elderCount * 0.9 + peopleBreakdown.childCount * 0.6
    : peopleCount
  const normalizedPeopleCount = Math.max(1, Math.round(effectivePeopleCount * 10) / 10)

  if (normalizedPeopleCount <= 1) {
    return 2
  }

  if (normalizedPeopleCount <= 2) {
    return 3
  }

  if (normalizedPeopleCount <= 4) {
    return Math.ceil(normalizedPeopleCount) + 1
  }

  if (normalizedPeopleCount <= 6) {
    return Math.ceil(normalizedPeopleCount) + 2
  }

  if (normalizedPeopleCount <= 8) {
    return Math.ceil(normalizedPeopleCount) + 1
  }

  return 10
}

function hasNegativeIntent(text, aliases) {
  const aliasPattern = aliases.join('|')
  const expression = new RegExp(`${NEGATIVE_PREFIX_PATTERN}(?:[^，。；,;\\s]{0,6})?(?:${aliasPattern})`)
  return expression.test(text)
}

function hasPositiveIntent(text, aliases) {
  return aliases.some((alias) => text.includes(alias)) && !hasNegativeIntent(text, aliases)
}

function normalizeRequestText(text) {
  return String(text || '').trim().replace(/\s+/g, '')
}

function buildDishSearchText(dish) {
  return [dish.name, dish.category, dish.servingTemperature, ...(dish.tags || [])]
    .filter(Boolean)
    .join(' ')
}

function isSpicyDish(dish) {
  const searchableText = buildDishSearchText(dish)
  return includesAny(searchableText, SPICY_KEYWORDS) && !includesAny(searchableText, SPICY_SAFE_HINTS)
}

function buildRequestSummary(summaryParts) {
  return summaryParts.filter(Boolean).join('，')
}

export function analyzeMenuRequest(text, fallbackMenuCount) {
  const normalizedText = normalizeRequestText(text)
  const summaryParts = []

  if (!normalizedText) {
    return {
      text: '',
      fallbackMenuCount,
      hasRequest: false,
      hasQuantityIntent: false,
      peopleCount: null,
      peopleBreakdown: null,
      explicitDishCount: null,
      requestedDishCount: null,
      preferLight: false,
      preferHot: false,
      preferCold: false,
      preferSoup: false,
      avoidSoup: false,
      preferStaple: false,
      avoidStaple: false,
      preferVegetarian: false,
      preferMoreVegetables: false,
      preferHearty: false,
      preferSpicy: false,
      avoidSpicy: false,
      excludedRuleKeys: [],
      selectorEnabled: true,
      summary: '',
    }
  }

  const explicitDishCount = extractNumber(normalizedText, new RegExp(`${REQUEST_NUMBER_PATTERN}(?:道|个)?菜(?:品)?`))
  const groupedPeople = parseGroupedPeopleCount(normalizedText)
  const directPeopleCount =
    extractNumber(normalizedText, new RegExp(`${REQUEST_NUMBER_PATTERN}(?:位|个人|人)`)) ??
    extractNumber(normalizedText, new RegExp(`(?:适合|够|给)${REQUEST_NUMBER_PATTERN}(?:位|个人|人)`))
  const peopleCount = groupedPeople?.total ?? directPeopleCount
  const requestedDishCount = explicitDishCount ?? deriveDishCountFromPeople(peopleCount, groupedPeople)

  const preferLight = includesAny(normalizedText, LIGHT_KEYWORDS)
  const preferHot = /(?:热菜|热乎|热的)/.test(normalizedText)
  const preferCold = /(?:凉菜|冷菜|凉拌|冰镇)/.test(normalizedText)
  const preferSoup =
    hasPositiveIntent(normalizedText, ['汤', '喝汤']) &&
    /(?:来点|想喝|要|加一份|带个|配个|加个|最好有|想要|安排).{0,4}(?:汤|喝汤)|喝汤/.test(normalizedText)
  const avoidSoup = hasNegativeIntent(normalizedText, ['汤']) || /(?:不要|不想要|不喝|免|别来|不需要).{0,3}汤/.test(normalizedText)
  const preferStaple =
    /(?:主食|米饭|馒头|炒饭|盖饭|下饭)/.test(normalizedText) &&
    !hasNegativeIntent(normalizedText, ['主食', '米饭', '馒头', '炒饭', '盖饭'])
  const avoidStaple = hasNegativeIntent(normalizedText, ['主食', '米饭', '馒头', '炒饭', '盖饭', '面条', '面'])
  const preferVegetarian = /(?:吃素|素食|不吃肉|不要肉)/.test(normalizedText)
  const preferMoreVegetables =
    /(?:多点|多来点|多一些|多做点|加点).{0,4}(?:素菜|蔬菜|青菜)|(?:素菜|蔬菜|青菜).{0,4}(?:多一点|多一些|为主)/.test(normalizedText)
  const preferHearty = includesAny(normalizedText, HEARTY_KEYWORDS)
  const avoidSpicy = /(?:不辣|不要辣|不吃辣|忌辣|不能吃辣|别辣|少辣|微辣|不要麻辣|不吃麻辣|清淡点)/.test(normalizedText)
  const preferSpicy = includesAny(normalizedText, SPICY_KEYWORDS) && !avoidSpicy

  const excludedRules = HARD_EXCLUSION_RULES.filter((rule) => hasNegativeIntent(normalizedText, rule.aliases))

  if (peopleCount) {
    if (groupedPeople?.adultCount || groupedPeople?.childCount || groupedPeople?.elderCount) {
      const detailParts = []

      if (groupedPeople.adultCount) {
        detailParts.push(`${groupedPeople.adultCount}位成人`)
      }

      if (groupedPeople.childCount) {
        detailParts.push(`${groupedPeople.childCount}位小孩`)
      }

      if (groupedPeople.elderCount) {
        detailParts.push(`${groupedPeople.elderCount}位老人`)
      }

      summaryParts.push(`${peopleCount}人(${detailParts.join('，')})`)
    } else {
      summaryParts.push(`${peopleCount}人`)
    }
  }

  if (explicitDishCount) {
    summaryParts.push(`${explicitDishCount}道菜`)
  } else if (peopleCount && requestedDishCount) {
    summaryParts.push(`按${requestedDishCount}道菜估算`)
  }

  if (preferLight) {
    summaryParts.push('少油清淡')
  }

  if (preferHot) {
    summaryParts.push('偏热菜')
  }

  if (preferCold) {
    summaryParts.push('偏冷菜')
  }

  if (preferSoup) {
    summaryParts.push('带汤')
  }

  if (avoidSoup) {
    summaryParts.push('不要汤')
  }

  if (preferStaple) {
    summaryParts.push('带主食')
  }

  if (preferVegetarian) {
    summaryParts.push('偏素')
  }

  if (preferMoreVegetables) {
    summaryParts.push('多点素菜')
  }

  if (preferHearty) {
    summaryParts.push('偏下饭')
  }

  if (avoidSpicy) {
    summaryParts.push('不吃辣')
  }

  if (excludedRules.length) {
    summaryParts.push(`避开${excludedRules.map((rule) => rule.label).join('、')}`)
  }

  return {
    text: normalizedText,
    fallbackMenuCount,
    hasRequest: true,
    hasQuantityIntent: Boolean(requestedDishCount),
    peopleCount,
    peopleBreakdown: groupedPeople,
    explicitDishCount,
    requestedDishCount,
    preferLight,
    preferHot,
    preferCold,
    preferSoup,
    avoidSoup,
    preferStaple,
    avoidStaple,
    preferVegetarian,
    preferMoreVegetables,
    preferHearty,
    preferSpicy,
    avoidSpicy,
    excludedRuleKeys: excludedRules.map((rule) => rule.key),
    selectorEnabled: !requestedDishCount,
    summary: buildRequestSummary(summaryParts),
  }
}

function isDishExcluded(dish, analysis, availableDishes) {
  if (!analysis.hasRequest) {
    return false
  }

  if (analysis.preferVegetarian && dish.category === '荤菜') {
    return true
  }

  if (analysis.avoidSpicy) {
    const nonSpicyAlternatives = availableDishes.filter((candidate) => !isSpicyDish(candidate))
    if (nonSpicyAlternatives.length && isSpicyDish(dish)) {
      return true
    }
  }

  const searchableText = buildDishSearchText(dish)

  return HARD_EXCLUSION_RULES.some((rule) => {
    if (!analysis.excludedRuleKeys.includes(rule.key)) {
      return false
    }

    return includesAny(searchableText, rule.aliases)
  })
}

function scoreDishAgainstRequest(dish, analysis) {
  let score = 0
  const searchableText = buildDishSearchText(dish)
  const calories = toSafeCalories(dish.calories)

  if (analysis.preferLight) {
    if (calories <= 260 || includesAny(searchableText, ['低热量', '轻负担', '清爽', ...LIGHT_DISH_KEYWORDS])) {
      score += 6
    } else if (calories <= 360) {
      score += 2
    }

    if (calories >= 460 || includesAny(searchableText, HEAVY_KEYWORDS)) {
      score -= 8
    }
  }

  if (analysis.preferHot) {
    score += dish.servingTemperature === '热菜' ? 4 : -2
  }

  if (analysis.preferCold) {
    score += dish.servingTemperature === '冷菜' ? 4 : -2
  }

  if (analysis.preferSoup) {
    score += dish.category === '汤' ? 6 : 0
  }

  if (analysis.preferStaple) {
    score += dish.category === '主食' ? 6 : 0
  }

  if (analysis.avoidSoup && dish.category === '汤') {
    score -= 10
  }

  if (analysis.avoidStaple && dish.category === '主食') {
    score -= 8
  }

  if (analysis.preferVegetarian) {
    score += dish.category === '素菜' ? 6 : -4
  }

  if (analysis.preferMoreVegetables) {
    if (dish.category === '素菜') {
      score += 8
    } else if (dish.category === '荤菜') {
      score -= 3
    }
  }

  if (analysis.preferHearty) {
    if (dish.category === '荤菜') {
      score += 4
    }

    if (dish.category === '主食') {
      score += 5
    }

    if (includesAny(searchableText, HEAVY_KEYWORDS) || calories >= 360) {
      score += 4
    }

    if (includesAny(searchableText, LIGHT_DISH_KEYWORDS) || calories <= 180) {
      score -= 2
    }
  }

  if (analysis.preferSpicy) {
    score += isSpicyDish(dish) ? 4 : 0
  }

  if (analysis.avoidSpicy) {
    score += isSpicyDish(dish) ? -20 : 3
  }

  return score
}

function sortByCaloriesGap(dishes, targetAverage) {
  return [...dishes].sort((left, right) => {
    const leftGap = Math.abs(toSafeCalories(left.calories) - targetAverage)
    const rightGap = Math.abs(toSafeCalories(right.calories) - targetAverage)
    return leftGap - rightGap
  })
}

function sortCandidates(pool, selectedIds, options = {}) {
  const { scoreMap, targetAverageCalories = DEFAULT_TARGET_CALORIES_PER_DISH } = options
  const candidates = pool.filter((dish) => !selectedIds.has(dish.id))

  if (!candidates.length) {
    return []
  }

  if (!scoreMap) {
    return sortByCaloriesGap(candidates, targetAverageCalories)
  }

  return [...candidates].sort((left, right) => {
    const scoreDifference = (scoreMap.get(right.id) || 0) - (scoreMap.get(left.id) || 0)

    if (scoreDifference !== 0) {
      return scoreDifference
    }

    const leftGap = Math.abs(toSafeCalories(left.calories) - targetAverageCalories)
    const rightGap = Math.abs(toSafeCalories(right.calories) - targetAverageCalories)

    if (leftGap !== rightGap) {
      return leftGap - rightGap
    }

    return left.name.localeCompare(right.name, 'zh-CN')
  })
}

function takeOne(pool, selectedIds, options = {}) {
  const ranked = sortCandidates(pool, selectedIds, options)

  if (!ranked.length) {
    return null
  }

  if (options.scoreMap) {
    const bestScore = options.scoreMap.get(ranked[0].id) || 0
    const topCandidates = ranked.filter((dish) => (options.scoreMap.get(dish.id) || 0) === bestScore).slice(0, 3)
    return topCandidates[Math.floor(Math.random() * topCandidates.length)]
  }

  return ranked[Math.floor(Math.random() * Math.min(ranked.length, 3))]
}

function appendDish(selected, selectedIds, dish) {
  if (!dish || selectedIds.has(dish.id)) {
    return false
  }

  selected.push(dish)
  selectedIds.add(dish.id)
  return true
}

export function generateClassicMenu(dishes, count, options = {}) {
  if (!Array.isArray(dishes) || !dishes.length) {
    return []
  }

  const safeCount = Math.max(1, Math.min(Number(count) || 1, dishes.length))
  const targetAverageCalories = Math.max(120, Number(options.targetAverageCalories) || DEFAULT_TARGET_CALORIES_PER_DISH)
  const rankedOptions = {
    scoreMap: options.scoreMap,
    targetAverageCalories,
  }
  const selected = []
  const selectedIds = new Set()
  const meatPool = getCategoryPool(dishes, '荤菜')
  const vegPool = getCategoryPool(dishes, '素菜')
  const coldPool = getTemperaturePool(dishes, '冷菜')
  const hotPool = getTemperaturePool(dishes, '热菜')
  const staplePool = options.includeStaple === false ? [] : getCategoryPool(dishes, '主食')
  const soupPool = options.includeSoup === false ? [] : getCategoryPool(dishes, '汤')

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

    appendDish(selected, selectedIds, takeOne(pool, selectedIds, rankedOptions))
  })

  if (selected.length < safeCount) {
    const remaining = dishes.filter((dish) => !selectedIds.has(dish.id))
    const rankedRemaining = sortCandidates(remaining, selectedIds, rankedOptions)

    rankedRemaining.forEach((dish) => {
      if (selected.length < safeCount) {
        appendDish(selected, selectedIds, dish)
      }
    })
  }

  if (selected.length < safeCount) {
    const fallback = pickRandomItems(
      dishes.filter((dish) => !selectedIds.has(dish.id)),
      safeCount - selected.length,
    )
    fallback.forEach((dish) => appendDish(selected, selectedIds, dish))
  }

  if (staplePool.length) {
    appendDish(selected, selectedIds, takeOne(staplePool, selectedIds, rankedOptions))
  }

  if (soupPool.length) {
    appendDish(selected, selectedIds, takeOne(soupPool, selectedIds, rankedOptions))
  }

  return selected
}

function buildScoreMap(dishes, analysis) {
  return new Map(dishes.map((dish) => [dish.id, scoreDishAgainstRequest(dish, analysis)]))
}

function buildMainTargets(totalCount, analysis, dishes) {
  const availableMeat = getCategoryPool(dishes, '荤菜').length
  const availableVeg = getCategoryPool(dishes, '素菜').length
  const availableCold = getTemperaturePool(dishes, '冷菜').length
  const availableHot = getTemperaturePool(dishes, '热菜').length
  const availableStaple = getCategoryPool(dishes, '主食').length
  const availableSoup = getCategoryPool(dishes, '汤').length

  let stapleSlots = 0
  let soupSlots = 0

  if (!analysis.avoidStaple && availableStaple) {
    if (analysis.preferStaple || analysis.preferHearty || totalCount >= 4) {
      stapleSlots = 1
    }
  }

  if (!analysis.avoidSoup && availableSoup) {
    if (analysis.preferSoup || (!analysis.preferHearty && totalCount >= 5)) {
      soupSlots = 1
    }
  }

  while (stapleSlots + soupSlots >= totalCount) {
    if (!analysis.preferSoup && soupSlots) {
      soupSlots -= 1
      continue
    }

    if (!analysis.preferStaple && stapleSlots) {
      stapleSlots -= 1
      continue
    }

    if (soupSlots) {
      soupSlots -= 1
      continue
    }

    if (stapleSlots) {
      stapleSlots -= 1
    }
  }

  const mainsCount = Math.max(totalCount - stapleSlots - soupSlots, 0)
  let meatTarget = 0
  let vegTarget = 0

  if (analysis.preferVegetarian || !availableMeat) {
    vegTarget = mainsCount
  } else if (!availableVeg) {
    meatTarget = mainsCount
  } else if (analysis.preferMoreVegetables) {
    vegTarget = Math.max(1, Math.ceil(mainsCount * 0.6))
    meatTarget = Math.max(0, mainsCount - vegTarget)
  } else if (analysis.preferHearty) {
    meatTarget = Math.max(1, Math.ceil(mainsCount * 0.6))
    vegTarget = Math.max(0, mainsCount - meatTarget)
  } else {
    meatTarget = Math.ceil(mainsCount / 2)
    vegTarget = mainsCount - meatTarget
  }

  if (!analysis.preferVegetarian && availableMeat && availableVeg && mainsCount >= 2) {
    meatTarget = Math.max(meatTarget, 1)
    vegTarget = Math.max(vegTarget, 1)
  }

  meatTarget = Math.min(meatTarget, availableMeat)
  vegTarget = Math.min(vegTarget, availableVeg)

  while (meatTarget + vegTarget > mainsCount) {
    if (analysis.preferMoreVegetables && meatTarget > 0) {
      meatTarget -= 1
    } else if (vegTarget > 0) {
      vegTarget -= 1
    } else if (meatTarget > 0) {
      meatTarget -= 1
    }
  }

  while (meatTarget + vegTarget < mainsCount) {
    if (availableVeg > vegTarget && (analysis.preferMoreVegetables || vegTarget <= meatTarget)) {
      vegTarget += 1
      continue
    }

    if (availableMeat > meatTarget) {
      meatTarget += 1
      continue
    }

    if (availableVeg > vegTarget) {
      vegTarget += 1
      continue
    }

    break
  }

  let hotMin = 0
  let coldMin = 0

  if (!analysis.preferHot && !analysis.preferCold && availableHot && availableCold && mainsCount >= 2) {
    hotMin = 1
    coldMin = 1
  } else if (analysis.preferHot && availableHot && mainsCount >= 1) {
    hotMin = 1
  } else if (analysis.preferCold && availableCold && mainsCount >= 1) {
    coldMin = 1
  }

  hotMin = Math.min(hotMin, mainsCount)
  coldMin = Math.min(coldMin, Math.max(0, mainsCount - hotMin))

  return {
    mainsCount,
    categoryTargets: {
      荤菜: meatTarget,
      素菜: vegTarget,
    },
    temperatureMinimums: {
      热菜: hotMin,
      冷菜: coldMin,
    },
    stapleSlots,
    soupSlots,
  }
}

function countSelectedBy(selected, selector) {
  return selected.reduce((accumulator, dish) => {
    const key = selector(dish)
    accumulator[key] = (accumulator[key] || 0) + 1
    return accumulator
  }, {})
}

function selectBalancedMains(dishes, plan, rankedOptions) {
  const mainsPool = dishes.filter((dish) => dish.category !== '主食' && dish.category !== '汤')
  const selected = []
  const selectedIds = new Set()

  while (selected.length < plan.mainsCount) {
    const selectedByCategory = countSelectedBy(selected, (dish) => dish.category)
    const selectedByTemperature = countSelectedBy(selected, (dish) => dish.servingTemperature)
    const remainingSlots = plan.mainsCount - selected.length
    const ranked = sortCandidates(mainsPool, selectedIds, rankedOptions).sort((left, right) => {
      const leftUtility = getMainDishUtility(left, plan, selectedByCategory, selectedByTemperature, remainingSlots, rankedOptions.scoreMap)
      const rightUtility = getMainDishUtility(right, plan, selectedByCategory, selectedByTemperature, remainingSlots, rankedOptions.scoreMap)
      return rightUtility - leftUtility
    })

    if (!ranked.length) {
      break
    }

    appendDish(selected, selectedIds, ranked[0])
  }

  return { selected, selectedIds }
}

function getMainDishUtility(dish, plan, selectedByCategory, selectedByTemperature, remainingSlots, scoreMap) {
  let utility = scoreMap ? scoreMap.get(dish.id) || 0 : 0
  const unmetCategoryCount = Object.entries(plan.categoryTargets).reduce((total, [category, target]) => {
    return total + Math.max(0, target - (selectedByCategory[category] || 0))
  }, 0)
  const unmetTemperatureCount = Object.entries(plan.temperatureMinimums).reduce((total, [temperature, target]) => {
    return total + Math.max(0, target - (selectedByTemperature[temperature] || 0))
  }, 0)
  const dishCategoryTarget = plan.categoryTargets[dish.category] || 0
  const dishTemperatureTarget = plan.temperatureMinimums[dish.servingTemperature] || 0
  const categoryMissing = Math.max(0, dishCategoryTarget - (selectedByCategory[dish.category] || 0))
  const temperatureMissing = Math.max(0, dishTemperatureTarget - (selectedByTemperature[dish.servingTemperature] || 0))

  if (categoryMissing > 0) {
    utility += 18
  } else if (dishCategoryTarget === 0 && unmetCategoryCount > 0) {
    utility -= 10
  } else if (unmetCategoryCount > 0) {
    utility -= 4
  }

  if (temperatureMissing > 0) {
    utility += 10
  } else if (dishTemperatureTarget === 0 && unmetTemperatureCount > 0) {
    utility -= 5
  }

  if (remainingSlots <= unmetCategoryCount + unmetTemperatureCount && categoryMissing === 0 && temperatureMissing === 0) {
    utility -= 16
  }

  return utility
}

function fillSupportDishes(targetCount, pool, selected, selectedIds, rankedOptions) {
  let remaining = targetCount

  while (remaining > 0) {
    const picked = takeOne(pool, selectedIds, rankedOptions)

    if (!appendDish(selected, selectedIds, picked)) {
      break
    }

    remaining -= 1
  }
}

function generateRequestedMenu(dishes, count, options, analysis) {
  const allowedDishes = dishes.filter((dish) => !isDishExcluded(dish, analysis, dishes))

  if (!allowedDishes.length) {
    return generateClassicMenu(dishes, count, options)
  }

  const scoreMap = buildScoreMap(allowedDishes, analysis)

  if (!analysis.hasQuantityIntent) {
    return generateClassicMenu(allowedDishes, count, {
      ...options,
      includeSoup: !analysis.avoidSoup,
      includeStaple: !analysis.avoidStaple,
      scoreMap,
    })
  }

  const targetTotalCount = Math.max(1, Math.min(analysis.requestedDishCount || count || 1, allowedDishes.length))
  const plan = buildMainTargets(targetTotalCount, analysis, allowedDishes)
  const rankedOptions = {
    scoreMap,
    targetAverageCalories: Math.max(120, Number(options.targetAverageCalories) || DEFAULT_TARGET_CALORIES_PER_DISH),
  }
  const { selected, selectedIds } = selectBalancedMains(allowedDishes, plan, rankedOptions)

  fillSupportDishes(plan.stapleSlots, getCategoryPool(allowedDishes, '主食'), selected, selectedIds, rankedOptions)
  fillSupportDishes(plan.soupSlots, getCategoryPool(allowedDishes, '汤'), selected, selectedIds, rankedOptions)

  if (selected.length < targetTotalCount) {
    const fallbackClassic = generateClassicMenu(allowedDishes, Math.max(targetTotalCount - 2, 1), {
      ...options,
      includeSoup: !analysis.avoidSoup,
      includeStaple: !analysis.avoidStaple,
      scoreMap,
    })

    fallbackClassic.forEach((dish) => {
      if (selected.length < targetTotalCount) {
        appendDish(selected, selectedIds, dish)
      }
    })
  }

  if (selected.length < targetTotalCount) {
    const rankedRemaining = sortCandidates(allowedDishes, selectedIds, rankedOptions)
    rankedRemaining.forEach((dish) => {
      if (selected.length < targetTotalCount) {
        appendDish(selected, selectedIds, dish)
      }
    })
  }

  return selected.slice(0, targetTotalCount)
}

export function generateBalancedMenu(dishes, count, options = {}) {
  if (!Array.isArray(dishes) || !dishes.length) {
    return []
  }

  const analysis = analyzeMenuRequest(options.requestText, count)

  if (!analysis.hasRequest) {
    return generateClassicMenu(dishes, count, options)
  }

  return generateRequestedMenu(dishes, count, options, analysis)
}
