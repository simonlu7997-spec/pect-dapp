# 海康互联开放平台 API 调用规范

## 加密算法说明

开放平台使用 **RSA** 加密算法。

## 1. 获取签名秘钥

用户在创建自己的应用之后，选择 **凭证&基础信息** 的 **应用秘钥** 页签。可以查询到自己应用的秘钥（Secret）。

## 2. 请求加密

### 2.1 GET 请求参数加密

1. 获取所有 GET 请求参数（? 后面的字符串，不包含 ?）
2. 将请求参数组合成 **参数=参数值** 的格式，并且把这些参数用 & 字符连接起来
3. 用 RSAUtils#encryptByPrivateKey 方法，对 2 中生成的待加密字符串进行加密
4. 将 3 中生成的加密后的字符串做 url encode 操作
5. 将 4 中生成的 url encode 后字符串拼接成 `querySecret=url encode后字符串`，替换原有的 GET 请求参数

### 2.2 POST 请求参数加密

1. 获取所有 POST 请求参数（request body 中的内容）
2. 用 RSAUtils#encryptByPrivateKey 方法，对 1 中的待加密字符串进行加密
3. 将 3 中生成的加密后字符串拼接成 `{"bodySecret":"加密后字符串"}`，替换原有的 POST 请求参数

## 3. 响应结果解密

开放平台所有的接口，响应结果均包含 code、msg、data 三个参数：
- code：0 为成功，非 0 为失败
- msg：请求失败时候的提示信息
- data：响应结果（加密的）

开放平台的响应结果加密，是针对 data 进行加密。
注意：如果返回的 data 为 null 或空字符串 ""，则不会加密。

## RSA 加密方式

- 使用 PKCS#8 格式私钥（AppSecret）
- 加密算法：RSA/ECB/PKCS1Padding
- 由于 RSA 每次只能加密 117 字节，需要分段加密（每段 117 字节）
- 解密时每段 128 字节

## 请求头

需要携带：
- App-Access-Token: 应用访问凭证（通过 appKey + appSecret 获取）
- Content-Type: application/json

## 获取 App-Access-Token

POST https://open-api.hikiot.com/auth/third/applyAuthCode
Body: {"appKey": "xxx", "appSecret": "xxx"}

注意：获取访问凭证接口不需要加密请求参数

## 抓图接口

POST https://open-api.hikiot.com/device/direct/v1/captureImage/captureImage
请求头：
- Content-Type: application/json
- App-Access-Token: at-xxx
- User-Access-Token: ut-xxx

请求参数（加密前）：
{
  "deviceSerial": "GR7953610",
  "payload": {
    "channelNo": 1
  }
}

响应（解密后）：
{
  "code": 0,
  "msg": "操作成功！",
  "data": {
    "captureUrl": "https://..."
  }
}

## 获取 App-Access-Token

POST https://open-api.hikiot.com/auth/third/applyAuthCode
注意：该接口不需要加密，也不需要 Token

请求参数：
{
  "appKey": "xxx",
  "appSecret": "xxx"
}

响应：
{
  "code": 0,
  "data": {
    "appAccessToken": "at-xxx",
    "expireTime": 7200
  }
}

## 获取 User-Access-Token

需要通过授权码流程获取，但对于内部自建应用，可以不需要 User-Access-Token
内部自建应用只需要 App-Access-Token
