import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const start = Date.now()
  
  // Log the request
  console.log(`→ ${request.method} ${request.nextUrl.pathname}`)
  
  const response = NextResponse.next()
  
  // Log response time
  response.headers.set('x-response-time', `${Date.now() - start}ms`)
  
  return response
}

// Log all requests except static files
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

