# 实现计划

## 1. 扩展类型定义

- [x] 1.1 更新调度配置类型
  - 在 `src/types/index.ts` 中添加 `ScheduleMode` 类型
  - 扩展 `ScheduleConfig` 接口，添加 `mode`、`intervalDays`、`weekDays` 字段
  - 将 `preferredTime` 改为 `executionTimes` 数组
  - 添加 `ValidationResult` 接口
  - _Requirements: 1.1, 2.1, 3.1_

## 2. 实现调度计算器核心模块

- [x] 2.1 创建调度计算器模块
  - 创建 `src/lib/scheduler.ts`
  - 实现 `validateScheduleConfig` 函数，验证配置有效性
  - 实现 `isValidExecutionDay` 函数，判断指定日期是否为有效执行日
  - 实现 `getNextExecutionTime` 函数，计算下次执行时间
  - 实现 `generateCronExpression` 函数，生成 cron 表达式
  - _Requirements: 1.3, 2.3, 4.1, 4.2, 4.3, 4.4, 5.1, 6.1_

- [ ]* 2.2 编写间隔天数输入验证属性测试
  - **Property 8: 间隔天数输入验证**
  - 测试 1-30 范围内的值返回有效，范围外返回错误
  - **Validates: Requirements 1.1**

- [ ]* 2.3 编写执行时间点数量限制属性测试
  - **Property 7: 执行时间点数量限制**
  - 测试数组长度超过 3 时返回错误
  - **Validates: Requirements 3.1**

- [ ]* 2.4 编写执行日计算正确性属性测试
  - **Property 2: 执行日计算正确性**
  - 测试下次执行日期等于上次执行日期加上间隔天数
  - **Validates: Requirements 1.3, 6.4**

- [ ]* 2.5 编写执行日判断正确性属性测试
  - **Property 3: 执行日判断正确性**
  - 测试三种模式下的执行日判断逻辑
  - **Validates: Requirements 2.3, 6.1**

- [ ]* 2.6 编写 cron 表达式生成正确性属性测试
  - **Property 5: Cron 表达式生成正确性**
  - 测试生成的 cron 包含正确的时间和星期几
  - **Validates: Requirements 4.1, 4.4**

- [ ]* 2.7 编写下次执行时间计算正确性属性测试
  - **Property 6: 下次执行时间计算正确性**
  - 测试计算结果大于当前时间且符合调度约束
  - **Validates: Requirements 5.1**

## 3. 实现时区转换工具

- [x] 3.1 创建时区转换模块
  - 创建 `src/lib/timezone.ts`
  - 实现 `toUtc` 函数，将用户时区时间转换为 UTC
  - 实现 `fromUtc` 函数，将 UTC 时间转换为用户时区
  - 实现 `getTimezoneOffset` 函数，获取时区偏移量
  - _Requirements: 4.2, 5.2_

- [ ]* 3.2 编写时区转换正确性属性测试
  - **Property 4: 时区转换正确性**
  - 测试往返转换返回原始时间
  - **Validates: Requirements 4.2, 5.2**

## 4. Checkpoint - 确保核心模块测试通过

- [x] 4. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## 5. 更新设置 API

- [x] 5.1 更新设置 API 路由
  - 修改 `src/app/api/settings/route.ts`
  - GET 方法返回扩展的 schedule 配置
  - PUT 方法接受并验证扩展的 schedule 配置
  - 添加配置验证逻辑，返回验证错误
  - _Requirements: 1.2, 2.2, 3.2_

- [x] 5.2 添加执行时间预览 API
  - 创建 `src/app/api/settings/preview/route.ts`
  - POST 方法接受调度配置，返回下次执行时间预览
  - 返回用户时区和 UTC 两种格式的时间
  - _Requirements: 5.1, 5.2, 5.3_

- [ ]* 5.3 编写调度配置往返一致性属性测试
  - **Property 1: 调度配置往返一致性**
  - 测试保存后读取返回相同配置
  - **Validates: Requirements 1.2, 2.2, 3.2**

## 6. 更新设置页面 UI

- [x] 6.1 实现调度模式选择器组件
  - 创建 `src/components/ScheduleModeSelector.tsx`
  - 支持 daily、interval、weekly 三种模式切换
  - 根据模式显示/隐藏相关配置项
  - _Requirements: 1.1, 2.1_

- [x] 6.2 实现执行时间点编辑器组件
  - 创建 `src/components/ExecutionTimesEditor.tsx`
  - 支持添加/删除时间点
  - 限制最多 3 个时间点
  - 验证重复时间点
  - _Requirements: 3.1, 3.3, 3.4_

- [x] 6.3 实现周执行日选择器组件
  - 创建 `src/components/WeekDaySelector.tsx`
  - 显示周一到周日的复选框
  - 验证至少选择一天
  - _Requirements: 2.1, 2.4_

- [x] 6.4 实现下次执行预览组件
  - 创建 `src/components/NextExecutionPreview.tsx`
  - 实时显示下次执行时间（用户时区和 UTC）
  - 配置无效时显示"无法计算"
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 6.5 更新设置页面
  - 修改 `src/app/dashboard/settings/page.tsx`
  - 集成新的调度配置组件
  - 添加保存和验证逻辑
  - _Requirements: 1.1, 2.1, 3.1_

## 7. Checkpoint - 确保 UI 组件正常工作

- [x] 7. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## 8. 更新每日发布脚本

- [x] 8.1 添加执行日检查逻辑
  - 修改 `scripts/daily-publish.ts`
  - 在主函数开头添加执行日检查
  - 读取 settings.json 和 history.json 获取配置和上次执行时间
  - 非执行日时记录日志并正常退出
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 8.2 更新历史记录写入
  - 修改 `scripts/daily-publish.ts`
  - 执行成功后更新 `lastExecutionTime` 字段
  - _Requirements: 6.4_

## 9. 更新默认配置

- [x] 9.1 更新默认配置文件
  - 修改 `config/settings.json` 添加新字段默认值
  - 设置默认模式为 `daily`
  - 设置默认执行时间为 `["08:00"]`
  - _Requirements: 1.2, 2.2, 3.2_

- [x] 9.2 更新 GitHub API 客户端默认配置
  - 修改 `src/lib/github.ts` 中的默认 settings 配置
  - 确保新字段有合理的默认值
  - _Requirements: 1.2, 2.2, 3.2_

## 10. Final Checkpoint - 确保所有测试通过

- [x] 10. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
