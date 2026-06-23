export function formatTimeSlot(slotStr: string, lang: string = 'ar') {
  if (!slotStr) return '';
  if (slotStr.startsWith('REQUEST_')) {
    return lang === 'ar' ? 'طلب موعد خاص' : 'Special Appointment Request';
  }
  // Try to parse range "HH:MM-HH:MM"
  const rangeParts = slotStr.split('-');
  
  const formatSingleTime = (time: string) => {
    const trimmed = time.trim();
    const parts = trimmed.split(':');
    if (parts.length < 2) return trimmed;
    const hrs = parseInt(parts[0], 10);
    const mins = parts[1];
    if (isNaN(hrs)) return trimmed;
    const ampm = hrs >= 12 ? (lang === 'ar' ? 'م' : 'PM') : (lang === 'ar' ? 'ص' : 'AM');
    const hrs12 = hrs % 12 || 12;
    return `${hrs12}:${mins} ${ampm}`;
  };

  if (rangeParts.length === 2) {
    return `${formatSingleTime(rangeParts[0])} - ${formatSingleTime(rangeParts[1])}`;
  }
  return formatSingleTime(slotStr);
}

export function formatDateTime(dateStr: string, lang: string = 'ar') {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  // Custom format to guarantee clean display with AM/PM (ص/م)
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  let hrs = date.getHours();
  const mins = String(date.getMinutes()).padStart(2, '0');
  
  const ampm = hrs >= 12 ? (lang === 'ar' ? 'م' : 'PM') : (lang === 'ar' ? 'ص' : 'AM');
  hrs = hrs % 12 || 12;
  
  return lang === 'ar' 
    ? `${day}/${month}/${year} ${hrs}:${mins} ${ampm}`
    : `${month}/${day}/${year} ${hrs}:${mins} ${ampm}`;
}
