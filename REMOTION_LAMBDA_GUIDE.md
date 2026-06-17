# Remotion Lambda 部署指南

## 概述

Remotion Lambda 是 Remotion 提供的云端视频渲染服务，使用 AWS Lambda 函数在云端渲染视频。本指南将带你从零配置 AWS 账号和 Remotion Lambda。

---

## 第一步：创建 AWS 账号

### 1.1 注册 AWS 账号

1. 访问 https://aws.amazon.com/
2. 点击右上角 **"创建 AWS 账户"**
3. 填写邮箱地址和账户名称
4. 验证邮箱 → 设置密码
5. 填写联系信息（个人账号选 Personal）
6. 添加信用卡/借记卡（AWS 需要验证身份，会扣 $1 验证费）
7. 验证手机号
8. 选择 **Basic Support Plan（免费）**

### 1.2 注意事项

- 新账号有 **12 个月免费套餐**，但 Lambda 渲染可能会产生费用
- Remotion Lambda 的渲染费用大约是 **$0.05-$0.20/分钟** 视频（取决于分辨率和复杂度）
- 建议设置 **预算告警**，避免意外费用

---

## 第二步：创建 IAM 用户和访问密钥

不要使用 Root 账号的密钥！需要创建专用 IAM 用户。

### 2.1 创建 IAM 策略

1. 登录 AWS Console → 搜索 **IAM**
2. 左侧菜单 → **Policies** → **Create policy**
3. 选择 **JSON** 标签，粘贴以下策略：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RemotionLambda",
      "Effect": "Allow",
      "Action": [
        "lambda:CreateFunction",
        "lambda:GetFunction",
        "lambda:DeleteFunction",
        "lambda:InvokeFunction",
        "lambda:PutFunctionEventInvokeConfig",
        "lambda:AddPermission",
        "lambda:RemovePermission",
        "lambda:ListVersionsByFunction",
        "lambda:GetFunctionConfiguration",
        "lambda:UpdateFunctionConfiguration"
      ],
      "Resource": "arn:aws:lambda:*:*:function:remotion-*"
    },
    {
      "Sid": "RemotionS3",
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:PutBucketPolicy",
        "s3:GetBucketLocation",
        "s3:PutBucketCORS"
      ],
      "Resource": [
        "arn:aws:s3:::remotionlambda-*",
        "arn:aws:s3:::remotionlambda-*/*"
      ]
    },
    {
      "Sid": "RemotionIAM",
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole",
        "iam:GetRole",
        "iam:PassRole",
        "iam:DeleteRole",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy"
      ],
      "Resource": "arn:aws:iam::*:role/remotion-lambda-role"
    },
    {
      "Sid": "RemotionCloudWatch",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogStreams",
        "logs:GetLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Sid": "RemotionSTS",
      "Effect": "Allow",
      "Action": ["sts:GetCallerIdentity"],
      "Resource": "*"
    }
  ]
}
```

4. 命名策略为 `RemotionLambdaDeployPolicy`，点击 **Create policy**

### 2.2 创建 IAM 用户

1. 左侧菜单 → **Users** → **Create user**
2. 用户名：`remotion-deployer`
3. 勾选 **"Provide user access to the AWS Management Console"**（可选，主要用于调试）
4. 点击 Next
5. 选择 **"Attach policies directly"**
6. 搜索并勾选 `RemotionLambdaDeployPolicy`
7. 点击 Next → **Create user**

### 2.3 生成访问密钥（Access Key）

1. 进入刚创建的用户 `remotion-deployer`
2. 标签页 **Security credentials**
3. 滚动到 **Access keys** → **Create access key**
4. 选择 **"Application running outside AWS"**
5. 点击 Next → **Create access key**
6. **立即保存** Access Key ID 和 Secret Access Key！
   - 下载 CSV 文件
   - 或者复制粘贴保存
   - ⚠️ 这个密钥只显示一次，关闭页面后将无法再次查看

---

## 第三步：配置环境变量

在项目根目录创建 `.env.local` 文件（已加入 .gitignore）：

```bash
# AWS 凭证（来自第二步的 IAM 用户）
REMOTION_AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXX
REMOTION_AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxx

# AWS 区域（建议使用离你最近的）
REMOTION_AWS_REGION=ap-northeast-1  # 东京
# REMOTION_AWS_REGION=ap-southeast-1  # 新加坡
# REMOTION_AWS_REGION=us-east-1       # 美国东部（最便宜）
```

> ⚠️ **安全提示**：`.env.local` 文件已自动被 `.gitignore` 忽略。绝对不要将 AWS 密钥提交到 Git！

---

## 第四步：安装 Remotion Lambda

```bash
cd /Users/guanz/hack/LyricVibe

# 安装 @remotion/lambda CLI 和 SDK
npm install @remotion/lambda @remotion/cli

# 安装 AWS SDK（Remotion Lambda 的底层依赖）
npm install @aws-sdk/client-lambda @aws-sdk/client-s3 @aws-sdk/client-iam @aws-sdk/client-cloudwatch-logs
```

---

## 第五步：部署 Lambda 函数到 AWS

### 5.1 初始化 Remotion Lambda

```bash
# 配置 Remotion Lambda 站点
npx remotion lambda sites create src/lib/remotion/index.ts \
  --site-name=lyricvibe-renderer \
  --region=ap-northeast-1
```

### 5.2 部署渲染函数

```bash
npx remotion lambda functions deploy \
  --region=ap-northeast-1 \
  --memory=3008 \
  --timeout=240 \
  --disk=10000
```

参数说明：
- `--memory=3008`：分配给 Lambda 的内存（MB），影响 CPU 性能
- `--timeout=240`：最大渲染时间（秒），4 分钟
- `--disk=10000`：临时存储空间（MB），10GB

### 5.3 验证部署

```bash
# 列出已部署的函数
npx remotion lambda functions ls --region=ap-northeast-1

# 列出已部署的站点
npx remotion lambda sites ls --region=ap-northeast-1
```

---

## 第六步：在代码中使用 Remotion Lambda 渲染

更新 `src/app/api/render/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import {
  renderMediaOnLambda,
  getRenderProgress,
} from "@remotion/lambda/client";

// Lambda 配置常量
const LAMBDA_CONFIG = {
  region: process.env.REMOTION_AWS_REGION || "ap-northeast-1",
  functionName: "remotion-render-xxx", // 从 functions ls 获取
  siteName: "lyricvibe-renderer",
  serveUrl: "", // 部署站点后获得
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoUrl, audioUrl, lyrics, styleParams, filter, speed, pitch } = body;

    // 渲染参数
    const inputProps = {
      videoUrl,
      audioUrl,
      lyrics,
      styleParams,
      filter,
      speed,
      pitch,
    };

    // 提交渲染任务到 AWS Lambda
    const renderResponse = await renderMediaOnLambda({
      region: LAMBDA_CONFIG.region,
      functionName: LAMBDA_CONFIG.functionName,
      serveUrl: LAMBDA_CONFIG.serveUrl,
      composition: "LyricVibeVideo",
      inputProps,
      codec: "h264",
      framesPerLambda: 20,
    });

    // 轮询渲染进度
    let done = false;
    let downloadUrl = "";

    while (!done) {
      const progress = await getRenderProgress({
        renderId: renderResponse.renderId,
        bucketName: renderResponse.bucketName,
        region: LAMBDA_CONFIG.region,
      });

      if (progress.done) {
        downloadUrl = progress.outputFile as string;
        done = true;
      } else {
        // 等待后重试
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    return NextResponse.json({ downloadUrl });
  } catch (error) {
    console.error("Render error:", error);
    return NextResponse.json(
      { error: "Render failed" },
      { status: 500 }
    );
  }
}
```

---

## 第七步：费用预估

| 分辨率 | 内存 | 渲染速度 | 费用/分钟 |
|--------|------|----------|-----------|
| 720p | 2048MB | ~实时 | ~$0.05 |
| 1080p | 3008MB | ~1.5x实时 | ~$0.08 |
| 4K | 10240MB | ~4x实时 | ~$0.20 |

**月费用估算**（假设每月渲染 50 个 3 分钟 1080p 视频）：
- Lambda 计算：50 × 3 × $0.08 = **~$12/月**
- S3 存储：少量 → **~$0.50/月**
- 数据传输：少量 → **~$1/月**
- **总计约 $15/月**

---

## 常见问题

### Q: 部署失败，提示权限不足？
检查 IAM 策略是否正确附加。可以在 IAM → Users → remotion-deployer → Permissions 中验证。

### Q: 渲染超时？
增加 Lambda timeout（`--timeout=480` 表示 8 分钟），或者减少 `framesPerLambda` 参数让每个 Lambda 处理更少的帧。

### Q: 能否不用 Lambda，本地渲染？
可以。Remotion 支持本地 CLI 渲染：
```bash
npx remotion render LyricVibeVideo out/video.mp4 \
  --props='{"lyrics": [...]}' \
  --codec=h264
```
但本地渲染会占用 CPU，且需要安装完整的 Remotion 环境。

### Q: AWS 密钥如何安全管理？
- 开发环境：`.env.local`（已 gitignore）
- 生产环境：使用 Vercel/Netlify 的环境变量功能
- 建议定期轮换 Access Key

---

## 替代方案

如果暂时不想配置 AWS，可以先使用本地渲染：

```bash
npm install @remotion/cli
npx remotion studio  # 启动本地预览
npx remotion render LyricVibeVideo out.mp4  # 本地渲染
```
