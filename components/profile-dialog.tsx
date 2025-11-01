'use client'

import { useState, useEffect } from 'react'
import { User, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase'
import { useStore } from '@/lib/store'

interface LocalProfile {
  display_name?: string
  avatar_url?: string
  bio?: string
}

export function ProfileDialog() {
  const [open, setOpen] = useState(false)
  const [localProfile, setLocalProfile] = useState<LocalProfile>({})
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const { userProfile, updateUserProfile } = useStore()

  // Load profile from Zustand store when dialog opens
  useEffect(() => {
    if (open) {
      loadProfileFromStore()
    }
  }, [open, userProfile])

  const loadProfileFromStore = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      setEmail(user.email || '')

      // Use profile from Zustand store
      if (userProfile) {
        setLocalProfile({
          display_name: userProfile.display_name || '',
          avatar_url: userProfile.avatar_url || '',
          bio: userProfile.bio || '',
        })
        setPreviewUrl(userProfile.avatar_url || '')
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('Not authenticated')
        return
      }

      let avatarUrl = localProfile.avatar_url

      // Upload avatar if a new file was selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const filePath = `avatars/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true })

        if (uploadError) {
          toast.error('Failed to upload avatar')
          console.error('Upload error:', uploadError)
          return
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)

        avatarUrl = publicUrl
      }

      // Use Zustand store's updateUserProfile method
      await updateUserProfile(user.id, {
        display_name: localProfile.display_name,
        avatar_url: avatarUrl,
        bio: localProfile.bio,
      })

      toast.success('Profile updated successfully!')
      setOpen(false)
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Failed to save profile')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <User className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
          <DialogDescription>
            Manage your profile information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={previewUrl} alt="Profile" />
              <AvatarFallback className="text-2xl">
                {localProfile.display_name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <Label htmlFor="avatar">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('avatar')?.click()}
                  asChild
                >
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Avatar
                  </span>
                </Button>
              </Label>
            </div>
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input
              id="display-name"
              type="text"
              placeholder="Enter your display name"
              value={localProfile.display_name || ''}
              onChange={(e) =>
                setLocalProfile({ ...localProfile, display_name: e.target.value })
              }
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell us about yourself..."
              value={localProfile.bio || ''}
              onChange={(e) =>
                setLocalProfile({ ...localProfile, bio: e.target.value })
              }
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Optional - A short description about yourself
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

