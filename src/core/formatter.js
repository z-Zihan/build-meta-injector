export function formatTime(timeZone, locale) {
  try {
    const formatter = new Intl.DateTimeFormat(locale || 'zh-CN', {
      timeZone: timeZone || 'Asia/Shanghai',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const now = new Date();
    const parts = formatter.formatToParts(now);

    const partMap = {};
    for (const part of parts) {
      if (part.type !== 'literal') {
        partMap[part.type] = part.value;
      }
    }

    const year = partMap.year || '';
    const month = partMap.month || '';
    const day = partMap.day || '';
    const hour = partMap.hour || '';
    const minute = partMap.minute || '';
    const second = partMap.second || '';

    return `${year}/${month}/${day} ${hour}:${minute}:${second}`;
  } catch (_err) {
    return null;
  }
}

export function sanitizeCommentValue(value, maxLength) {
  const max = maxLength || 200;
  if (value === null || value === undefined) return '';

  let str = String(value);

  // Replace -- with em-dash pair to avoid HTML comment issues
  str = str.replace(/--/g, '— —');

  // Replace newlines and tabs with spaces
  str = str.replace(/[\n\r\t]+/g, ' ');

  // Remove control characters (0x00-0x1F, 0x7F-0x9F) except space (0x20)
  str = str.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

  // Trim whitespace
  str = str.trim();

  // Truncate
  if (str.length > max) {
    str = str.substring(0, max);
  }

  return str;
}

export function sanitizeCommentKey(key, maxLength) {
  const max = maxLength || 50;
  if (key === null || key === undefined) return '';

  let str = String(key);

  // Remove < and > which are unsafe in HTML comments
  str = str.replace(/[<>]/g, '');

  // Replace -- with em-dash pair
  str = str.replace(/--/g, '— —');

  // Replace newlines and tabs with spaces
  str = str.replace(/[\n\r\t]+/g, ' ');

  // Remove control characters
  str = str.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

  // Trim
  str = str.trim();

  // Truncate
  if (str.length > max) {
    str = str.substring(0, max);
  }

  return str;
}
