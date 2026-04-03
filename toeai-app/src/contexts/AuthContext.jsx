import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { isLikelyInAppWebView, openInExternalBrowser } from '../utils/inAppWebView'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async (redirectTo) => {
    try {
      if (typeof window !== 'undefined' && isLikelyInAppWebView()) {
        openInExternalBrowser(window.location.href)
        const err = new Error(
          '외부 브라우저로 열었습니다. Safari/Chrome에서 이 페이지를 연 뒤 다시 구글 로그인을 눌러 주세요.',
        )
        err.code = 'WEBVIEW_OAUTH_REDIRECT'
        throw err
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo || (typeof window !== 'undefined' ? window.location.origin : undefined),
        },
      })
      if (error) throw error
    } catch (err) {
      console.error('Google 로그인 실패:', err)
      throw err
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = { user, loading, signInWithGoogle, signOut }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
