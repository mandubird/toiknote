import { createContext, useContext, useState, useCallback } from 'react'

const RefreshListContext = createContext(null)

export function RefreshListProvider({ children }) {
  const [listVersion, setListVersion] = useState(0)
  const refreshList = useCallback(() => setListVersion((v) => v + 1), [])
  return (
    <RefreshListContext.Provider value={{ listVersion, refreshList }}>
      {children}
    </RefreshListContext.Provider>
  )
}

export function useRefreshList() {
  const ctx = useContext(RefreshListContext)
  return ctx?.refreshList ?? (() => {})
}

export function useListVersion() {
  const ctx = useContext(RefreshListContext)
  return ctx?.listVersion ?? 0
}
