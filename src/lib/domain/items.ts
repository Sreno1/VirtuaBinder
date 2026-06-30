import type { BinderItem } from '../types';
import { locationForItem } from './locations';

export function displayItemTitle(item: BinderItem) {
  return item.title.trim() || 'Admit One';
}

export function displayItemDate(item: BinderItem) {
  if (!item.date) return 'Undated';
  const [year, month, day] = item.date.split('-');
  return year && month && day ? `${month}/${day}/${year}` : item.date;
}

export function displayItemPeople(item: BinderItem) {
  return item.people.trim() || 'None listed';
}

export function displayItemNotes(item: BinderItem) {
  return item.notes.trim() || 'No notes yet.';
}

export function displayItemLocation(item: BinderItem) {
  const location = locationForItem(item);
  return location ? `${location.name}, ${location.region}` : 'No location listed';
}
