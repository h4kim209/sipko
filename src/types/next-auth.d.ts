// src/types/next-auth.d.ts — Augmentasi tipe sesi NextAuth untuk SIPKO

import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      nip?: string
    } & DefaultSession['user']
  }

  interface User {
    role?: string
    nip?: string
  }
}
