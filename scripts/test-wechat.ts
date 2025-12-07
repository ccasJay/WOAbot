/**
 * 测试微信公众号草稿箱功能
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// 手动加载 .env.local
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
});

interface AccessTokenResponse {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
}

interface DraftResponse {
  media_id?: string;
  errcode?: number;
  errmsg?: string;
}

interface UploadResponse {
  media_id?: string;
  url?: string;
  errcode?: number;
  errmsg?: string;
}

function createTestPng(): Buffer {
  // 创建一个简单的 PNG 图片 (900x500 像素)
  // PNG 文件格式：签名 + IHDR + IDAT + IEND
  const width = 900;
  const height = 500;

  // PNG 签名
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0); // 宽度
  ihdrData.writeUInt32BE(height, 4); // 高度
  ihdrData.writeUInt8(8, 8); // 位深度
  ihdrData.writeUInt8(2, 9); // 颜色类型 (RGB)
  ihdrData.writeUInt8(0, 10); // 压缩方法
  ihdrData.writeUInt8(0, 11); // 过滤方法
  ihdrData.writeUInt8(0, 12); // 隔行扫描

  const ihdrChunk = createPngChunk('IHDR', ihdrData);

  // 创建简单的图像数据 (蓝色背景)
  const zlib = require('zlib');
  const rawData: number[] = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // 过滤类型
    for (let x = 0; x < width; x++) {
      rawData.push(74, 144, 217); // RGB: 蓝色 #4A90D9
    }
  }
  const compressedData = zlib.deflateSync(Buffer.from(rawData));
  const idatChunk = createPngChunk('IDAT', compressedData);

  // IEND chunk
  const iendChunk = createPngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createPngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type);
  const crcData = Buffer.concat([typeBuffer, data]);

  // 计算 CRC32
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

  // 使用本地生成的 PNG 图片 (900x500)
  const imageBuffer = createTestPng();

  // 构建 multipart/form-data
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
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: body,
  });

  const data: UploadResponse = await response.json();

  if (data.errcode) {
    throw new Error(`上传封面图失败: ${data.errcode} - ${data.errmsg}`);
  }

  console.log('✅ 封面图上传成功');
  return data.media_id!;
}

async function getAccessToken(): Promise<string> {
  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error('WECHAT_APP_ID 或 WECHAT_APP_SECRET 未配置');
  }

  console.log('🔄 正在获取 access_token...');

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
  const response = await fetch(url);
  const data: AccessTokenResponse = await response.json();

  if (data.errcode) {
    throw new Error(`获取 access_token 失败: ${data.errcode} - ${data.errmsg}`);
  }

  console.log('✅ access_token 获取成功');
  return data.access_token!;
}

async function createDraft(accessToken: string, thumbMediaId: string): Promise<string> {
  console.log('🔄 正在创建草稿...');

  const url = `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${accessToken}`;

  // 测试文章内容
  const article = {
    articles: [
      {
        title: '【测试】Perplexity API 测试文章',
        author: 'AI助手',
        content: `
          <p>这是一篇测试文章，用于验证微信公众号草稿箱功能是否正常。</p>
          <p>测试时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p>
          <p>如果您在草稿箱中看到这篇文章，说明 API 配置正确！</p>
        `,
        content_source_url: '',
        thumb_media_id: thumbMediaId,
        need_open_comment: 0,
        only_fans_can_comment: 0,
      },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(article),
  });

  const data: DraftResponse = await response.json();

  if (data.errcode) {
    throw new Error(`创建草稿失败: ${data.errcode} - ${data.errmsg}`);
  }

  console.log('✅ 草稿创建成功');
  return data.media_id!;
}

async function testWechatApi(): Promise<void> {
  console.log('========== 微信公众号 API 测试 ==========\n');

  try {
    // 1. 获取 access_token
    const accessToken = await getAccessToken();

    // 2. 上传封面图
    const thumbMediaId = await uploadThumbImage(accessToken);

    // 3. 创建草稿
    const mediaId = await createDraft(accessToken, thumbMediaId);

    console.log('\n========== 测试结果 ==========');
    console.log('✅ 所有测试通过！');
    console.log(`📝 草稿 media_id: ${mediaId}`);
    console.log('\n请登录微信公众平台查看草稿箱，确认文章已创建。');
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  }
}

testWechatApi();
