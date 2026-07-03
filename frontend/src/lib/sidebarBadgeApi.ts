import type { SidebarBadgeCounts } from '../types/sidebarBadges'
import { apiFetch } from './apiClient'

export function getSidebarBadgeCounts(): Promise<SidebarBadgeCounts> {
  return apiFetch<SidebarBadgeCounts>('/sidebar-counts')
}
