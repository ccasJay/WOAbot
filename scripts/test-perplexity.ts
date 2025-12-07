/**
 * 简单测试 Perplexity API 连接
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// 手动加载 .env.local
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
});

async function testPerplexityApi(): Promise<void> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  
  if (!apiKey) {
    console.error('❌ PERPLEXITY_API_KEY 未配置');
    process.exit(1);
  }

  console.log('🔄 正在测试 Perplexity API...\n');

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'user',
            content: '用中文简短介绍一下今天的科技新闻，100字以内'
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API 请求失败: ${response.status}`);
      console.error(errorText);
      process.exit(1);
    }

    const data = await response.json();
    
    console.log('✅ API 连接成功！\n');
    console.log('--- 生成的内容 ---');
    console.log(data.choices[0].message.content);
    console.log('\n--- Token 使用 ---');
    console.log(`输入: ${data.usage?.prompt_tokens || 'N/A'}`);
    console.log(`输出: ${data.usage?.completion_tokens || 'N/A'}`);
    console.log(`总计: ${data.usage?.total_tokens || 'N/A'}`);

  } catch (error) {
    console.error('❌ 请求出错:', error);
    process.exit(1);
  }
}

testPerplexityApi();
