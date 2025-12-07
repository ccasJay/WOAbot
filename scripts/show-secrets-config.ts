#!/usr/bin/env tsx

/**
 * 显示需要配置到 GitHub Secrets 的值
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function showSecretsConfig(): Promise<void> {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     GitHub Secrets 配置助手                 ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // 读取 .env.local
  const envPath = resolve(process.cwd(), '.env.local');
  let envVars: { [key: string]: string } = {};

  try {
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        envVars[match[1].trim()] = match[2].trim();
      }
    });
  } catch (error) {
    console.error('❌ 无法读取 .env.local 文件');
    console.log('\n请确保 .env.local 文件存在并包含必要的配置');
    process.exit(1);
  }

  // 需要配置的 Secrets
  const requiredSecrets = [
    'PERPLEXITY_API_KEY',
    'WECHAT_APP_ID',
    'WECHAT_APP_SECRET'
  ];

  console.log('📋 需要在 GitHub 添加的 Secrets:\n');
  console.log('═'.repeat(50));
  
  const missingSecrets: string[] = [];
  
  requiredSecrets.forEach((secret, index) => {
    const value = envVars[secret];
    
    console.log(`\n${index + 1}. ${secret}`);
    console.log('─'.repeat(50));
    
    if (value) {
      // 部分隐藏敏感信息
      let displayValue = value;
      if (secret.includes('SECRET') || secret.includes('KEY')) {
        // 只显示前6个和后4个字符
        if (value.length > 10) {
          displayValue = value.substring(0, 6) + '...' + value.substring(value.length - 4);
        }
      }
      
      console.log(`   值: ${displayValue}`);
      console.log(`   长度: ${value.length} 字符`);
      console.log(`   状态: ✅ 已配置`);
    } else {
      console.log(`   状态: ❌ 未找到`);
      missingSecrets.push(secret);
    }
  });

  console.log('\n═'.repeat(50));

  if (missingSecrets.length > 0) {
    console.log('\n⚠️  警告: 以下配置缺失:');
    missingSecrets.forEach(secret => {
      console.log(`   - ${secret}`);
    });
    console.log('\n请先在 .env.local 中配置这些值');
  }

  console.log('\n\n📝 配置步骤:\n');
  console.log('1. 访问你的 GitHub 仓库 Secrets 页面:');
  console.log('   https://github.com/你的用户名/你的仓库/settings/secrets/actions\n');
  
  console.log('2. 点击 "New repository secret" 按钮\n');
  
  console.log('3. 逐个添加上述 Secrets（Name 和 Value）\n');
  
  console.log('4. 保存后重新运行 GitHub Actions\n');

  // 询问是否显示完整值
  if (requiredSecrets.every(s => envVars[s])) {
    const showFull = await question('\n是否显示完整的 Secret 值用于复制？(y/n) ');
    
    if (showFull.toLowerCase() === 'y') {
      console.log('\n⚠️  注意: 以下是敏感信息，请勿泄露！\n');
      console.log('═'.repeat(50));
      
      requiredSecrets.forEach(secret => {
        console.log(`\n${secret}:`);
        console.log(`${envVars[secret]}`);
        console.log('─'.repeat(50));
      });
      
      console.log('\n✅ 请复制上述值到 GitHub Secrets 中');
      console.log('⚠️  配置完成后，请勿分享或提交这些值到代码仓库！\n');
    }
  }

  // 提供快速复制命令
  console.log('\n💡 快速复制命令:\n');
  requiredSecrets.forEach(secret => {
    if (envVars[secret]) {
      console.log(`# 复制 ${secret}`);
      console.log(`echo "${envVars[secret]}" | pbcopy`);
      console.log('');
    }
  });

  console.log('\n🔗 相关链接:\n');
  console.log('- GitHub Secrets 设置: https://github.com/ccasJay/WOAbot/settings/secrets/actions');
  console.log('- GitHub Actions 页面: https://github.com/ccasJay/WOAbot/actions');
  console.log('- Perplexity API: https://www.perplexity.ai/settings/api');
  console.log('- 微信公众平台: https://mp.weixin.qq.com');

  rl.close();
}

showSecretsConfig().catch((error) => {
  console.error('❌ 错误:', error);
  process.exit(1);
});
