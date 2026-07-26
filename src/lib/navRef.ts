import { createNavigationContainerRef } from '@react-navigation/native';

// A ref to the root navigator so non-screen code (e.g. deep-link handling in
// RootNavigator) can navigate once the app is mounted.
export const navigationRef = createNavigationContainerRef();

// Focus the schedule tab and open a specific schedule's detail. Retries briefly
// because the tab navigator may not be mounted the instant a link is handled.
export function openSchedule(scheduleId: string, attempt = 0): void {
  if (navigationRef.isReady()) {
    // Untyped ref (no param list), so cast navigate to reach the nested route.
    (navigationRef.navigate as (name: string, params: unknown) => void)(
      'ScheduleTab',
      { screen: 'ScheduleDetail', params: { scheduleId } },
    );
    return;
  }
  if (attempt < 20) setTimeout(() => openSchedule(scheduleId, attempt + 1), 150);
}
