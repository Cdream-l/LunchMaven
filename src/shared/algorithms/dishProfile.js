export const CATEGORY_OPTIONS = ['荤菜', '素菜', '汤', '主食']
export const TEMPERATURE_OPTIONS = ['冷菜', '热菜']

// 兼容历史版本的枚举值，读取旧数据时映射到当前标准。
const LEGACY_CATEGORY_MAP = {
  家常菜: '荤菜',
  轻食: '素菜',
  西式: '主食',
  未分类: '',
}

const LEGACY_TEMPERATURE_MAP = {
  凉菜: '冷菜',
  冷食: '冷菜',
  温热: '热菜',
}

const keywordGroups = {
  animalProtein: ['牛', '羊', '鸡', '鸭', '鱼', '虾', '排骨', '肉', '肥肠', '培根', '三文鱼'],
  vegetable: ['青椒', '黄瓜', '白菜', '生菜', '番茄', '西兰花', '土豆', '茄子', '豆腐', '菌菇', '菠菜'],
  soup: ['汤', '羹', '锅', '煲'],
  staple: ['饭', '面', '粉', '粥', '饺', '馄饨', '饼', '意面', '米线', '年糕'],
  cold: ['凉拌', '沙拉', '冰', '冷吃'],
  spicy: ['辣', '麻婆', '香锅', '水煮'],
  curry: ['咖喱'],
  braise: ['红烧', '焖', '炖', '卤'],
  fry: ['炒', '煎', '爆'],
}

function includesAny(name, words) {
  return words.some((word) => name.includes(word))
}

// 分类推断按“汤/主食/荤/素”优先级依次命中。
function inferCategory(name) {
  if (includesAny(name, keywordGroups.soup)) {
    return '汤'
  }

  if (includesAny(name, keywordGroups.staple)) {
    return '主食'
  }

  if (includesAny(name, keywordGroups.animalProtein)) {
    return '荤菜'
  }

  if (includesAny(name, keywordGroups.vegetable)) {
    return '素菜'
  }

  return '荤菜'
}

// 冷热只做轻量推断，默认归为热菜。
function inferServingTemperature(name) {
  if (includesAny(name, keywordGroups.cold)) {
    return '冷菜'
  }

  return '热菜'
}

// 以分类基线热量为主，再结合烹饪方式/关键词做增减修正。
function inferCalories(name, category, servingTemperature) {
  let calories = 320

  if (category === '主食') {
    calories = 520
  } else if (category === '汤') {
    calories = 140
  } else if (category === '素菜') {
    calories = 180
  } else if (category === '荤菜') {
    calories = 360
  }

  if (includesAny(name, ['炸', '锅包', '红烧肉', '肥肠', '培根'])) {
    calories += 120
  }

  if (includesAny(name, ['米饭', '面', '粉', '粥', '饼', '年糕'])) {
    calories += 90
  }

  if (includesAny(name, ['豆腐', '菌菇', '黄瓜', '西兰花', '生菜'])) {
    calories -= 40
  }

  if (includesAny(name, ['三文鱼', '牛腩', '排骨', '咖喱'])) {
    calories += 60
  }

  if (servingTemperature === '冷菜') {
    calories -= 20
  }

  return Math.max(50, Math.min(900, calories))
}

// 标签用于展示和筛选，尽量覆盖口味、做法、营养特征。
function inferTags(name, category, servingTemperature, calories) {
  const tags = new Set()

  if (servingTemperature === '冷菜') {
    tags.add('清爽')
  } else {
    tags.add('热菜')
  }

  if (includesAny(name, keywordGroups.spicy)) {
    tags.add('香辣')
  }

  if (includesAny(name, keywordGroups.curry)) {
    tags.add('浓郁')
  }

  if (includesAny(name, keywordGroups.braise)) {
    tags.add('炖煮')
  }

  if (includesAny(name, keywordGroups.fry)) {
    tags.add('快手')
  }

  if (category === '汤') {
    tags.add('暖胃')
  }

  if (category === '主食') {
    tags.add('饱腹')
  }

  if (category === '素菜') {
    tags.add('轻负担')
  }

  if (category === '荤菜') {
    tags.add('高蛋白')
  }

  if (calories <= 220) {
    tags.add('低热量')
  } else if (calories >= 450) {
    tags.add('高热量')
  }

  return [...tags]
}

// 根据菜名推断标准化画像（分类、冷热、热量、标签）。
export function inferDishProfile(name) {
  const cleanName = name.trim()
  const category = inferCategory(cleanName)
  const servingTemperature = inferServingTemperature(cleanName)
  const calories = inferCalories(cleanName, category, servingTemperature)
  const tags = inferTags(cleanName, category, servingTemperature, calories)

  return {
    calories,
    category,
    name: cleanName,
    servingTemperature,
    tags,
  }
}

// 合并历史数据与推断结果：优先保留用户已填信息，不足再回退推断值。
export function normalizeHistoricalDish(dish) {
  const inferred = inferDishProfile(dish.name || '')
  const legacyCategory = LEGACY_CATEGORY_MAP[dish.category] ?? dish.category
  const legacyTemperature = LEGACY_TEMPERATURE_MAP[dish.servingTemperature] ?? dish.servingTemperature
  const normalizedCategory = CATEGORY_OPTIONS.includes(legacyCategory) ? legacyCategory : inferred.category
  const normalizedTemperature = TEMPERATURE_OPTIONS.includes(legacyTemperature)
    ? legacyTemperature
    : inferred.servingTemperature

  return {
    ...inferred,
    ...dish,
    calories: Number(dish.calories) || Number(dish.giValue) || inferred.calories,
    category: normalizedCategory,
    servingTemperature: normalizedTemperature,
    tags: Array.isArray(dish.tags) && dish.tags.length ? dish.tags : inferred.tags,
  }
}
