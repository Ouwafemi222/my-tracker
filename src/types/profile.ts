export interface UserProfile {
  id: string
  email: string | null
  display_name: string
  import_token?: string | null
  created_at?: string
  updated_at?: string
}
