const STORAGE_KEY = 'nexredes_users'

export function getUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const users = raw ? JSON.parse(raw) : []
    return Array.isArray(users) ? users : []
  } catch {
    return []
  }
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users))
}

export function userExists(username, email) {
  const users = getUsers()
  const u = (username || '').toLowerCase()
  const e = (email || '').toLowerCase()
  if (u && users.some((user) => user.username === u)) return 'username'
  if (e && users.some((user) => user.email === e)) return 'email'
  return null
}

export function createUser({ name, username, email, password }) {
  const users = getUsers()
  const newUser = {
    name,
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password,
  }
  users.push(newUser)
  saveUsers(users)
  return newUser
}

export function findUser(username, password) {
  const u = username.toLowerCase()
  const users = getUsers()
  const user = users.find((user) => user.username === u)
  if (!user || user.password !== password) return null
  return user
}
