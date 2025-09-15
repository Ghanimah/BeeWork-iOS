export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string;
  avatar?: string;     // JSON-encoded customization (wings/face/hat)
  rating: number;
  totalHours: number;
  language: 'en' | 'ar';
  role?: 'admin' | 'employee';
}

export interface Shift {
  id: string;
  userId: string;
  title: string; // job title
  date: string;
  location: string; // e.g. "Downtown Cafe"
  latitude: number;  // for geolocation
  longitude: number; // for geolocation
  hourlyWage: number;
  status: 'scheduled' | 'in-progress' | 'completed';
  startTime?: string;
  endTime?: string;
  totalHours?: number;
  earnings?: number;
}

export interface Availability {
  day:
    | 'saturday'
    | 'sunday'
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday';
  available: boolean;
  startTime?: string;
  endTime?: string;
}

// Added 'customize-avatar' to support the Bee Avatar Builder page
export type Page =
  | 'home'
  | 'profile'
  | 'shift-detail'
  | 'availability'
  | 'settings'
  | 'no-shift'
  | 'assign-shift'
  | 'customize-avatar';
