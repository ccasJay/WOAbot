/**
 * 调度计算器模块
 * 
 * 提供调度配置验证、执行日判断、下次执行时间计算和 cron 表达式生成
 * Requirements: 1.3, 2.3, 4.1, 4.2, 4.3, 4.4, 5.1, 6.1
 */

import { ScheduleConfig, ScheduleMode, ValidationResult } from '@/types';
import { toUtc, getTimezoneOffset } from './timezone';

// 常量
const MIN_INTERVAL_DAYS = 1;
const MAX_INTERVAL_DAYS = 30;
const MAX_EXECUTION_TIMES = 3;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * 验证调度配置
 * Requirements: 1.1, 2.1, 2.4, 3.1, 3.4
 */
export function validateScheduleConfig(schedule: ScheduleConfig): ValidationResult {
  const errors: string[] = [];

  // 如果未启用，直接返回成功
  if (!schedule.enabled) {
    return { valid: true, errors: [] };
  }

  // 验证调度模式
  const validModes: ScheduleMode[] = ['daily', 'interval', 'weekly', 'custom'];
  if (!validModes.includes(schedule.mode)) {
    errors.push('无效的调度模式');
  }

  // custom 模式验证
  if (schedule.mode === 'custom') {
    if (!schedule.cron) {
      errors.push('自定义模式需要提供 cron 表达式');
    }
    // cron 表达式验证比较复杂，这里只做基本检查
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // 获取执行时间列表
  let executionTimes: string[] = [];
  if (schedule.executionTimes && schedule.executionTimes.length > 0) {
    executionTimes = schedule.executionTimes;
  } else if (schedule.times && schedule.times.length > 0) {
    executionTimes = schedule.times;
  } else if (schedule.time) {
    executionTimes = [schedule.time];
  }

  // 验证执行时间点
  if (executionTimes.length === 0) {
    errors.push('至少需要一个执行时间点');
  } else if (executionTimes.length > MAX_EXECUTION_TIMES) {
    errors.push(`执行时间点不能超过 ${MAX_EXECUTION_TIMES} 个`);
  } else {
    // 验证时间格式
    for (const time of executionTimes) {
      if (!TIME_REGEX.test(time)) {
        errors.push(`无效的时间格式: ${time}`);
      }
    }
    // 验证重复时间点
    const uniqueTimes = new Set(executionTimes);
    if (uniqueTimes.size !== executionTimes.length) {
      errors.push('执行时间点不能重复');
    }
  }

  // 验证间隔天数（仅 interval 模式）
  if (schedule.mode === 'interval') {
    if (schedule.intervalDays === undefined || schedule.intervalDays === null) {
      errors.push('间隔天数不能为空');
    } else if (schedule.intervalDays < MIN_INTERVAL_DAYS || schedule.intervalDays > MAX_INTERVAL_DAYS) {
      errors.push(`间隔天数必须在 ${MIN_INTERVAL_DAYS}-${MAX_INTERVAL_DAYS} 之间`);
    }
  }

  // 验证周执行日（仅 weekly 模式）
  if (schedule.mode === 'weekly') {
    const weekDays = schedule.weekDays || schedule.weekdays || [];
    if (weekDays.length === 0) {
      errors.push('至少需要选择一个执行日');
    } else {
      for (const day of weekDays) {
        if (day < 1 || day > 7) {
          errors.push(`无效的星期几: ${day}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}


/**
 * 判断指定日期是否为有效执行日
 * Requirements: 2.3, 6.1
 */
export function isValidExecutionDay(
  date: Date,
  schedule: ScheduleConfig,
  lastExecutionTime?: string
): boolean {
  // 如果未启用，返回 false
  if (!schedule.enabled) {
    return false;
  }

  switch (schedule.mode) {
    case 'daily':
      // 每日模式：任何日期都是有效执行日
      return true;

    case 'interval':
      // 间隔天数模式：检查距离上次执行的天数
      if (!lastExecutionTime) {
        // 没有上次执行记录，允许执行
        return true;
      }
      const lastDate = new Date(lastExecutionTime);
      const daysDiff = Math.floor(
        (date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysDiff >= (schedule.intervalDays || 1);

    case 'weekly':
      // 每周指定日期模式：检查星期几
      // JavaScript getDay(): 0=周日, 1=周一, ..., 6=周六
      // 我们的格式: 1=周一, ..., 7=周日
      const jsDay = date.getDay();
      const ourDay = jsDay === 0 ? 7 : jsDay;
      const weekDays = schedule.weekDays || schedule.weekdays || [];
      return weekDays.includes(ourDay);

    case 'custom':
      // custom 模式在 workflow 层面处理，这里始终返回 true
      return true;

    default:
      return false;
  }
}

/**
 * 计算下次执行时间
 * Requirements: 5.1
 */
export interface NextExecutionResult {
  nextTime: Date;        // 下次执行时间（用户时区）
  nextTimeUtc: Date;     // 下次执行时间（UTC）
  isValid: boolean;      // 配置是否有效
}

export function getNextExecutionTime(
  schedule: ScheduleConfig,
  currentTime: Date = new Date(),
  lastExecutionTime?: string
): NextExecutionResult | null {
  const validation = validateScheduleConfig(schedule);
  if (!validation.valid) {
    return null;
  }

  // custom 模式不支持计算下次执行时间
  if (schedule.mode === 'custom') {
    return null;
  }

  // 获取执行时间列表
  let executionTimes: string[] = [];
  if (schedule.executionTimes && schedule.executionTimes.length > 0) {
    executionTimes = schedule.executionTimes;
  } else if (schedule.times && schedule.times.length > 0) {
    executionTimes = schedule.times;
  } else if (schedule.time) {
    executionTimes = [schedule.time];
  }

  if (executionTimes.length === 0) {
    return null;
  }

  // 获取时区偏移
  const offsetHours = getTimezoneOffset(schedule.timezone || 'Asia/Shanghai');
  
  // 将当前时间转换为用户时区的日期
  const userTime = new Date(currentTime.getTime() + offsetHours * 60 * 60 * 1000);
  
  // 排序执行时间点
  const sortedTimes = [...executionTimes].sort();
  
  // 从当前日期开始，最多查找 365 天
  for (let dayOffset = 0; dayOffset < 365; dayOffset++) {
    const checkDate = new Date(userTime);
    checkDate.setDate(checkDate.getDate() + dayOffset);
    
    // 检查是否为有效执行日
    if (!isValidExecutionDay(checkDate, schedule, lastExecutionTime)) {
      continue;
    }
    
    // 检查每个执行时间点
    for (const timeStr of sortedTimes) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      
      const candidateTime = new Date(checkDate);
      candidateTime.setHours(hours, minutes, 0, 0);
      
      // 转换回 UTC 进行比较
      const candidateUtc = new Date(candidateTime.getTime() - offsetHours * 60 * 60 * 1000);
      
      if (candidateUtc > currentTime) {
        return {
          nextTime: candidateTime,
          nextTimeUtc: candidateUtc,
          isValid: true,
        };
      }
    }
  }
  
  return null;
}


/**
 * 生成 cron 表达式
 * Requirements: 4.1, 4.2, 4.3, 4.4
 * 
 * GitHub Actions cron 格式: 分 时 日 月 星期
 * 注意：cron 使用 UTC 时间
 */
export function generateCronExpression(schedule: ScheduleConfig): string[] {
  // 如果未启用，返回空数组
  if (!schedule.enabled) {
    return [];
  }

  const cronExpressions: string[] = [];
  
  // 处理 custom 模式
  if (schedule.mode === 'custom' && schedule.cron) {
    return [schedule.cron];
  }

  // 获取执行时间列表
  let executionTimes: string[] = [];
  if (schedule.executionTimes && schedule.executionTimes.length > 0) {
    executionTimes = schedule.executionTimes;
  } else if (schedule.times && schedule.times.length > 0) {
    executionTimes = schedule.times;
  } else if (schedule.time) {
    executionTimes = [schedule.time];
  }

  if (executionTimes.length === 0) {
    return [];
  }

  const offsetHours = getTimezoneOffset(schedule.timezone || 'Asia/Shanghai');

  for (const timeStr of executionTimes) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    // 转换为 UTC 时间
    let utcHours = hours - offsetHours;
    let dayAdjust = 0;
    
    if (utcHours < 0) {
      utcHours += 24;
      dayAdjust = -1;
    } else if (utcHours >= 24) {
      utcHours -= 24;
      dayAdjust = 1;
    }

    // 根据模式生成 cron
    switch (schedule.mode) {
      case 'daily':
        // 每日执行: 分 时 * * *
        cronExpressions.push(`${minutes} ${utcHours} * * *`);
        break;

      case 'interval':
        // 间隔天数模式：生成每日 cron，在脚本中判断是否执行
        // Requirements: 4.3
        cronExpressions.push(`${minutes} ${utcHours} * * *`);
        break;

      case 'weekly':
        // 每周指定日期: 分 时 * * 星期
        // cron 星期格式: 0=周日, 1=周一, ..., 6=周六
        const weekDays = schedule.weekDays || schedule.weekdays || [];
        const cronDays = weekDays.map(day => {
          let cronDay = day === 7 ? 0 : day;
          // 处理日期偏移
          if (dayAdjust !== 0) {
            cronDay = (cronDay + dayAdjust + 7) % 7;
          }
          return cronDay;
        }).sort((a, b) => a - b);
        
        cronExpressions.push(`${minutes} ${utcHours} * * ${cronDays.join(',')}`);
        break;
    }
  }

  return cronExpressions;
}

/**
 * 格式化下次执行时间为可读字符串
 */
export function formatNextExecutionTime(
  result: NextExecutionResult,
  timezone: string
): { userTime: string; utcTime: string } {
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  return {
    userTime: `${formatDate(result.nextTime)} (${timezone})`,
    utcTime: `${formatDate(result.nextTimeUtc)} (UTC)`,
  };
}
