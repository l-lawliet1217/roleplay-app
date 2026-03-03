export type Route = 'home' | 'test' | 'hearing' | 'presentation'

export interface RouteInfo {
  route: Route
  member: string | null
  watchId: string | null
}

export function useRoute(): RouteInfo {
  const pathname = window.location.pathname
  const params = new URLSearchParams(window.location.search)

  let route: Route
  switch (pathname) {
    case '/test':
      route = 'test'
      break
    case '/hearing':
      route = 'hearing'
      break
    case '/presentation':
      route = 'presentation'
      break
    default:
      route = 'home'
  }

  return {
    route,
    member: params.get('member'),
    watchId: params.get('watchId'),
  }
}
