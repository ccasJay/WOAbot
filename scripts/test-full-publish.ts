/**
 * 完整发布流程测试
 * 1. 使用 Perplexity API 生成 AI 领域新闻文章
 * 2. 格式化为微信公众号文章样式
 * 3. 推送到草稿箱
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// 加载环境变量
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
});

// ============ 类型定义 ============

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface AccessTokenResponse {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
}

interface UploadResponse {
  media_id?: string;
  url?: string;
  errcode?: number;
  errmsg?: string;
}

interface DraftResponse {
  media_id?: string;
  errcode?: number;
  errmsg?: string;
}


// ============ Perplexity API ============

async function generateArticle(): Promise<{ title: string; content: string; tokensUsed: number }> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY 未配置');

  console.log('🔄 正在使用 Perplexity API 生成文章...');

  const today = new Date().toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const prompt = `请撰写一篇关于今日AI领域最新动态的新闻综述文章。

要求：
1. 文章标题要吸引人，包含日期（${today}）
2. 文章长度约1500字
3. 内容涵盖：大模型进展、AI应用落地、行业动态、政策法规等方面
4. 使用专业但易懂的语言
5. 每个新闻点要有简要分析
6. 结尾要有总结和展望

请直接输出文章，格式如下：
标题：xxx
正文：
xxx`;

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Perplexity API 请求失败: ${response.status}`);
  }

  const data: PerplexityResponse = await response.json();
  const rawContent = data.choices[0].message.content;
  const tokensUsed = data.usage?.total_tokens || 0;

  // 解析标题和正文
  const titleMatch = rawContent.match(/标题[：:]\s*(.+)/);
  const title = titleMatch ? titleMatch[1].trim() : `${today} AI领域新闻速递`;

  let content = rawContent.replace(/标题[：:].+\n?/, '').replace(/正文[：:]?\n?/, '').trim();

  console.log(`✅ 文章生成成功，使用 ${tokensUsed} tokens`);
  console.log(`📝 标题: ${title}`);
  console.log(`📄 正文长度: ${content.length} 字`);

  return { title, content, tokensUsed };
}


// ============ 内容格式化 ============

function formatToWechatHtml(content: string): string {
  // 将纯文本转换为微信公众号 HTML 格式
  const paragraphs = content.split(/\n\n+/);

  const formattedParagraphs = paragraphs.map((p) => {
    p = p.trim();
    if (!p) return '';

    // 检测是否是标题行（以数字或特殊符号开头的短行）
    if (/^[一二三四五六七八九十\d]+[、.．]/.test(p) && p.length < 50) {
      return `<h3 style="font-size: 17px; font-weight: bold; color: #333; margin: 20px 0 10px 0;">${p}</h3>`;
    }

    // 检测是否是小标题（加粗文本）
    if (/^\*\*(.+)\*\*$/.test(p)) {
      const text = p.replace(/\*\*/g, '');
      return `<p style="font-size: 16px; font-weight: bold; color: #333; margin: 15px 0 8px 0;">${text}</p>`;
    }

    // 普通段落
    // 处理行内加粗
    p = p.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    return `<p style="font-size: 15px; color: #333; line-height: 1.8; margin: 0 0 15px 0; text-indent: 2em;">${p}</p>`;
  });

  // 添加文章头部样式
  const header = `
    <section style="padding: 10px 0; border-bottom: 2px solid #4A90D9; margin-bottom: 20px;">
      <p style="font-size: 14px; color: #888; margin: 0;">AI 领域每日速递 | ${new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p>
    </section>
  `;

  // 添加文章尾部
  const footer = `
    <section style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
      <p style="font-size: 13px; color: #888; text-align: center;">
        本文由 AI 自动生成，内容仅供参考<br/>
        数据来源：Perplexity AI
      </p>
    </section>
  `;

  return header + formattedParagraphs.filter(Boolean).join('\n') + footer;
}


// ============ 微信公众号 API ============

async function getAccessToken(): Promise<string> {
  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;
  if (!appId || !appSecret) throw new Error('微信配置缺失');

  console.log('🔄 正在获取微信 access_token...');

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
  const response = await fetch(url);
  const data: AccessTokenResponse = await response.json();

  if (data.errcode) {
    throw new Error(`获取 access_token 失败: ${data.errcode} - ${data.errmsg}`);
  }

  console.log('✅ access_token 获取成功');
  return data.access_token!;
}

// PNG 图片生成工具函数
function createTestPng(): Buffer {
  const width = 900;
  const height = 500;
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);
  ihdrData.writeUInt8(2, 9);
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);

  const ihdrChunk = createPngChunk('IHDR', ihdrData);

  const zlib = require('zlib');
  const rawData: number[] = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0);
    for (let x = 0; x < width; x++) {
      rawData.push(74, 144, 217); // 蓝色 #4A90D9
    }
  }
  const compressedData = zlib.deflateSync(Buffer.from(rawData));
  const idatChunk = createPngChunk('IDAT', compressedData);
  const iendChunk = createPngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createPngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type);
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  const table = getCrc32Table();
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function getCrc32Table(): number[] {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

async function uploadThumbImage(accessToken: string): Promise<string> {
  console.log('🔄 正在上传封面图...');

  const url = `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${accessToken}&type=image`;
  const imageBuffer = createTestPng();

  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\n`),
    Buffer.from(`Content-Disposition: form-data; name="media"; filename="cover.png"\r\n`),
    Buffer.from(`Content-Type: image/png\r\n\r\n`),
    imageBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: body,
  });

  const data: UploadResponse = await response.json();
  if (data.errcode) {
    throw new Error(`上传封面图失败: ${data.errcode} - ${data.errmsg}`);
  }

  console.log('✅ 封面图上传成功');
  return data.media_id!;
}

async function createDraft(
  accessToken: string,
  thumbMediaId: string,
  title: string,
  content: string
): Promise<string> {
  console.log('🔄 正在创建草稿...');

  const url = `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${accessToken}`;

  const article = {
    articles: [
      {
        title: title,
        author: 'AI助手',
        content: content,
        content_source_url: '',
        thumb_media_id: thumbMediaId,
        need_open_comment: 0,
        only_fans_can_comment: 0,
      },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(article),
  });

  const data: DraftResponse = await response.json();
  if (data.errcode) {
    throw new Error(`创建草稿失败: ${data.errcode} - ${data.errmsg}`);
  }

  console.log('✅ 草稿创建成功');
  return data.media_id!;
}


// ============ 主流程 ============

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     完整发布流程测试 - AI 新闻速递         ║');
  console.log('╚════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  try {
    // 1. 生成文章
    const { title, content, tokensUsed } = await generateArticle();

    // 2. 格式化为微信 HTML
    console.log('\n🔄 正在格式化文章...');
    const htmlContent = formatToWechatHtml(content);
    console.log('✅ 文章格式化完成');

    // 3. 获取微信 access_token
    console.log('');
    const accessToken = await getAccessToken();

    // 4. 上传封面图
    const thumbMediaId = await uploadThumbImage(accessToken);

    // 5. 创建草稿
    const mediaId = await createDraft(accessToken, thumbMediaId, title, htmlContent);

    // 输出结果
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║              🎉 发布成功！                 ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log(`\n📝 文章标题: ${title}`);
    console.log(`📄 文章长度: ${content.length} 字`);
    console.log(`🔢 Token 消耗: ${tokensUsed}`);
    console.log(`📦 草稿 ID: ${mediaId}`);
    console.log(`⏱️  总耗时: ${duration} 秒`);
    console.log('\n👉 请登录微信公众平台查看草稿箱');
  } catch (error) {
    console.error('\n❌ 发布失败:', error);
    process.exit(1);
  }
}

main();
