'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [displayNameError, setDisplayNameError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) {
      return 'Email is required'
    }
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address'
    }
    return ''
  }

  const validatePassword = (password: string) => {
    if (!password) {
      return 'Password is required'
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters'
    }
    return ''
  }

  const validateDisplayName = (name: string) => {
    if (!name) {
      return 'Display name is required'
    }
    if (name.length < 2) {
      return 'Display name must be at least 2 characters'
    }
    if (name.length > 50) {
      return 'Display name must be less than 50 characters'
    }
    return ''
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear previous errors
    setEmailError('')
    setPasswordError('')
    setDisplayNameError('')

    // Validate fields
    const emailErr = validateEmail(email)
    const passwordErr = validatePassword(password)
    const displayNameErr = isSignUp ? validateDisplayName(displayName) : ''

    if (emailErr || passwordErr || displayNameErr) {
      setEmailError(emailErr)
      setPasswordError(passwordErr)
      setDisplayNameError(displayNameErr)
      return
    }

    setLoading(true)

    try {
      if (isSignUp) {
        // Sign up the user
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })
        
        if (signUpError) throw signUpError
        
        // Create user profile automatically
        if (authData.user) {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert([{
              user_id: authData.user.id,
              display_name: displayName.trim(),
            }])
          
          if (profileError) {
            console.error('Error creating user profile:', profileError)
            // Don't throw - the account is created, profile can be added later
          }
        }
        
        toast.success('Account created successfully!')
        router.push('/chat')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        toast.success('Signed in successfully!')
        router.push('/chat')
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailChange = (value: string) => {
    setEmail(value)
    if (emailError) {
      setEmailError(validateEmail(value))
    }
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    if (passwordError) {
      setPasswordError(validatePassword(value))
    }
  }

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value)
    if (displayNameError) {
      setDisplayNameError(validateDisplayName(value))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">AI Chat UI</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSignUp ? 'Create a new account' : 'Sign in to your account'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => handleDisplayNameChange(e.target.value)}
                  disabled={loading}
                  className={displayNameError ? 'border-destructive focus-visible:ring-destructive' : ''}
                  autoComplete="name"
                />
                {displayNameError && (
                  <p className="text-sm text-destructive">{displayNameError}</p>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                disabled={loading}
                className={emailError ? 'border-destructive focus-visible:ring-destructive' : ''}
                autoComplete="email"
              />
              {emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  disabled={loading}
                  className={passwordError ? 'border-destructive focus-visible:ring-destructive pr-10' : 'pr-10'}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setIsSignUp(!isSignUp)
            // Clear errors and display name when switching
            setEmailError('')
            setPasswordError('')
            setDisplayNameError('')
            setDisplayName('')
          }}
          type="button"
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </Button>
      </div>
    </div>
  )
}

