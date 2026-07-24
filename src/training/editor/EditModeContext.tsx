import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'

const ADMIN_ROLE = 'Administrator'

interface EditModeState {
  /** True when the signed-in user may edit (has the Administrator role). */
  isAdmin: boolean
  /** True when the editing UI (frames, palette, handles) is active. */
  editing: boolean
  setEditing: (on: boolean) => void
  toggleEditing: () => void
}

const EditModeContext = createContext<EditModeState | null>(null)

/**
 * Owns the edit-mode flag for the training area. Placed above the training
 * header (inside AuthProvider) so the header can host the toggle. Non-admins
 * can never turn editing on.
 */
export function EditModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const isAdmin = !!user?.roles?.includes(ADMIN_ROLE)
  const [editing, setEditingRaw] = useState(false)

  const value = useMemo<EditModeState>(() => {
    const setEditing = (on: boolean) => setEditingRaw(isAdmin ? on : false)
    return {
      isAdmin,
      editing: isAdmin && editing,
      setEditing,
      toggleEditing: () => setEditingRaw((v) => (isAdmin ? !v : false)),
    }
  }, [isAdmin, editing])

  return <EditModeContext.Provider value={value}>{children}</EditModeContext.Provider>
}

export function useEditMode(): EditModeState {
  const ctx = useContext(EditModeContext)
  if (!ctx) throw new Error('useEditMode must be used within an EditModeProvider')
  return ctx
}
