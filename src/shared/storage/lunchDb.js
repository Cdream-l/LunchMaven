const DB_NAME = 'lunch-maven-db'
const DB_VERSION = 1
const STORE_NAME = 'app_state'

const STATE_KEYS = {
  dailyMenu: 'dailyMenu',
  dishes: 'dishes',
  menuCount: 'menuCount',
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function withStore(mode, executor) {
  return openDb().then(
    (database) =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode)
        const store = transaction.objectStore(STORE_NAME)

        transaction.oncomplete = () => {
          database.close()
        }

        transaction.onerror = () => {
          reject(transaction.error)
          database.close()
        }

        transaction.onabort = () => {
          reject(transaction.error)
          database.close()
        }

        executor(store, resolve, reject)
      }),
  )
}

function getValue(key) {
  return withStore('readonly', (store, resolve, reject) => {
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result?.value)
    request.onerror = () => reject(request.error)
  })
}

function setValue(key, value) {
  return withStore('readwrite', (store, resolve, reject) => {
    const request = store.put({ key, value })
    request.onsuccess = () => resolve(value)
    request.onerror = () => reject(request.error)
  })
}

export async function loadLunchState(fallbackState) {
  const [dishes, dailyMenu, menuCount] = await Promise.all([
    getValue(STATE_KEYS.dishes),
    getValue(STATE_KEYS.dailyMenu),
    getValue(STATE_KEYS.menuCount),
  ])

  return {
    dailyMenu: dailyMenu ?? fallbackState.dailyMenu,
    dishes: dishes ?? fallbackState.dishes,
    menuCount: menuCount ?? fallbackState.menuCount,
  }
}

export function saveDishes(dishes) {
  return setValue(STATE_KEYS.dishes, dishes)
}

export function saveDailyMenu(dailyMenu) {
  return setValue(STATE_KEYS.dailyMenu, dailyMenu)
}

export function saveMenuCount(menuCount) {
  return setValue(STATE_KEYS.menuCount, menuCount)
}
