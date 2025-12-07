/**
 * 时区转换工具模块
 * 
 * 提供时区转换和偏移量计算功能
 * Requirements: 4.2, 5.2
 */

// 常用时区偏移量（相对于 UTC 的小时数）
const TIMEZONE_OFFSETS: Record<string, number> = {
  'UTC': 0,
  'Asia/Shanghai': 8,
  'Asia/Tokyo': 9,
  'Asia/Seoul': 9,
  'Asia/Singapore': 8,
  'Asia/Hong_Kong': 8,
  'Europe/London': 0,
  'Europe/Paris': 1,
  'Europe/Berlin': 1,
  'America/New_York': -5,
  'America/Chicago': -6,
  'America/Denver': -7,
  'America/Los_Angeles': -8,
  'Australia/Sydney': 11,
};

/**
 * 获取时区偏移量（小时）
 * Requirements: 4.2
 */
export function getTimezoneOffset(timezone: string): number {
  // 首先检查预定义的时区
  if (timezone in TIMEZONE_OFFSETS) {
    return TIMEZONE_OFFSETS[timezone];
  }

  // 尝试使用 Intl API 获取偏移量
  try {
    const date = new Date();
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
  } catch {
    // 默认返回 0（UTC）
    return 0;
  }
}

/**
 * 将用户时区时间转换为 UTC
 * Requirements: 4.2
 * 
 * @param time - 时间字符串，格式 "HH:mm" 或 ISO 格式
 * @param timezone - 时区标识符
 * @returns UTC 时间字符串
 */
export function toUtc(time: string, timezone: string): string {
  const offsetHours = getTimezoneOffset(timezone);

  // 处理 HH:mm 格式
  if (/^\d{2}:\d{2}$/.test(time)) {
    const [hours, minutes] = time.split(':').map(Number);
    let utcHours = hours - offsetHours;
    
    if (utcHours < 0) {
      utcHours += 24;
    } else if (utcHours >= 24) {
      utcHours -= 24;
    }
    
    return `${String(utcHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  // 处理 ISO 格式或其他日期时间格式
  const date = new Date(time);
  if (isNaN(date.getTime())) {
    throw new Error(`无效的时间格式: ${time}`);
  }

  const utcDate = new Date(date.getTime() - offsetHours * 60 * 60 * 1000);
  return utcDate.toISOString();
}

/**
 * 将 UTC 时间转换为用户时区
 * Requirements: 5.2
 * 
 * @param utcTime - UTC 时间字符串，格式 "HH:mm" 或 ISO 格式
 * @param timezone - 目标时区标识符
 * @returns 用户时区时间字符串
 */
export function fromUtc(utcTime: string, timezone: string): string {
  const offsetHours = getTimezoneOffset(timezone);

  // 处理 HH:mm 格式
  if (/^\d{2}:\d{2}$/.test(utcTime)) {
    const [hours, minutes] = utcTime.split(':').map(Number);
    let localHours = hours + offsetHours;
    
    if (localHours < 0) {
      localHours += 24;
    } else if (localHours >= 24) {
      localHours -= 24;
    }
    
    return `${String(localHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  // 处理 ISO 格式或其他日期时间格式
  const date = new Date(utcTime);
  if (isNaN(date.getTime())) {
    throw new Error(`无效的时间格式: ${utcTime}`);
  }

  const localDate = new Date(date.getTime() + offsetHours * 60 * 60 * 1000);
  
  // 返回格式化的本地时间
  const year = localDate.getUTCFullYear();
  const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(localDate.getUTCDate()).padStart(2, '0');
  const hours = String(localDate.getUTCHours()).padStart(2, '0');
  const mins = String(localDate.getUTCMinutes()).padStart(2, '0');
  const secs = String(localDate.getUTCSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${mins}:${secs}`;
}

/**
 * 获取支持的时区列表
 */
export function getSupportedTimezones(): Array<{ value: string; label: string }> {
  return [
    { value: 'Asia/Shanghai', label: 'Asia/Shanghai (北京时间)' },
    { value: 'Asia/Tokyo', label: 'Asia/Tokyo (东京时间)' },
    { value: 'Asia/Seoul', label: 'Asia/Seoul (首尔时间)' },
    { value: 'Asia/Singapore', label: 'Asia/Singapore (新加坡时间)' },
    { value: 'Asia/Hong_Kong', label: 'Asia/Hong_Kong (香港时间)' },
    { value: 'Europe/London', label: 'Europe/London (伦敦时间)' },
    { value: 'Europe/Paris', label: 'Europe/Paris (巴黎时间)' },
    { value: 'America/New_York', label: 'America/New_York (纽约时间)' },
    { value: 'America/Los_Angeles', label: 'America/Los_Angeles (洛杉矶时间)' },
    { value: 'Australia/Sydney', label: 'Australia/Sydney (悉尼时间)' },
    { value: 'UTC', label: 'UTC' },
  ];
}
