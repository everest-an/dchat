# Dchat 域名配置指南

本指南将帮助您将 dechat.com 域名配置到 Vercel 部署的前端应用。

## 📋 前提条件

- ✅ 域名 dechat.com 已在阿里云注册
- ✅ 前端应用已部署到 Vercel: https://dechatcom.vercel.app
- ✅ 拥有阿里云域名管理权限
- ✅ 拥有 Vercel 项目管理权限

## 🎯 配置目标

将 dechat.com 和 www.dechat.com 都指向 Vercel 前端应用。

## 📝 步骤 1: 在 Vercel 添加自定义域名

### 1.1 访问 Vercel 项目设置

1. 登录 Vercel: https://vercel.com/login
2. 进入项目: https://vercel.com/everest-ans-projects/dechat.com
3. 点击顶部导航栏的 **"Settings"**
4. 在左侧菜单中选择 **"Domains"**

### 1.2 添加域名

1. 在 "Domains" 页面,找到 "Add" 输入框
2. 输入: `dechat.com`
3. 点击 **"Add"** 按钮
4. Vercel 会提示需要配置 DNS 记录

### 1.3 添加 www 子域名(可选)

1. 重复上述步骤,添加 `www.dechat.com`
2. 或者在添加主域名后,Vercel 会自动建议添加 www 子域名

### 1.4 获取 DNS 配置信息

Vercel 会显示需要配置的 DNS 记录,通常是以下两种之一:

**推荐方案: CNAME 记录**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
TTL: 600
```

**www 子域名**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

## 📝 步骤 2: 在阿里云配置 DNS 记录

### 2.1 登录阿里云域名控制台

1. 访问: https://dc.console.aliyun.com/
2. 登录您的阿里云账号
3. 找到并点击 **dechat.com** 域名

### 2.2 进入 DNS 解析设置

1. 点击域名右侧的 **"解析"** 按钮
2. 进入 DNS 解析设置页面

### 2.3 配置主域名 CNAME 记录

1. 点击 **"添加记录"** 按钮(如果已有 A 记录,需要先删除或修改)
2. 填写以下信息:
   - **记录类型**: CNAME
   - **主机记录**: @
   - **解析线路**: 默认
   - **记录值**: `cname.vercel-dns.com`
   - **TTL**: 600(10分钟)
3. 点击 **"确认"** 保存

### 2.4 添加 CNAME 记录(www 子域名)

1. 再次点击 **"添加记录"** 按钮
2. 填写以下信息:
   - **记录类型**: CNAME
   - **主机记录**: www
   - **解析线路**: 默认
   - **记录值**: `cname.vercel-dns.com`
   - **TTL**: 600(10分钟)或 3600(1小时)
3. 点击 **"确认"** 保存

### 2.5 删除冲突的记录(如果存在)

如果之前已经配置过其他 DNS 记录,可能需要删除或修改:

1. 检查是否有 @ 主机记录的 A 或 CNAME 记录
2. 检查是否有 www 主机记录的 A 或 CNAME 记录
3. 如果存在冲突,删除旧记录或修改为上述配置

## 📝 步骤 3: 验证配置

### 3.1 等待 DNS 传播

DNS 记录更新通常需要一些时间:
- **最快**: 几分钟
- **通常**: 10-30 分钟
- **最长**: 24-48 小时

### 3.2 检查 DNS 解析

使用以下命令检查 DNS 是否生效:

```bash
# 检查 A 记录
nslookup dechat.com

# 检查 CNAME 记录
nslookup www.dechat.com

# 或使用 dig 命令
dig dechat.com
dig www.dechat.com
```

**预期结果**:
```
dechat.com → cname.vercel-dns.com → 76.76.21.241 (或其他 Vercel IP)
www.dechat.com → cname.vercel-dns.com → 76.76.21.241 (或其他 Vercel IP)
```

### 3.3 在 Vercel 验证域名

1. 返回 Vercel 项目的 Domains 设置页面
2. 等待域名状态变为 **"Valid Configuration"** 或 **"Active"**
3. 如果显示错误,点击 **"Refresh"** 按钮重新检查

### 3.4 测试访问

在浏览器中访问:
- https://dechat.com
- https://www.dechat.com

应该都能正常访问 Dchat 应用。

## 🔒 步骤 4: 配置 SSL 证书(自动)

Vercel 会自动为您的自定义域名配置 SSL 证书:

1. 域名验证成功后,Vercel 会自动申请 Let's Encrypt SSL 证书
2. 通常在几分钟内完成
3. 证书会自动续期,无需手动管理

## 🎨 步骤 5: 配置域名重定向(可选)

### 5.1 www 重定向到主域名

如果您希望 www.dechat.com 自动重定向到 dechat.com:

1. 在 Vercel Domains 设置中
2. 找到 www.dechat.com 域名
3. 点击右侧的 **"..."** 菜单
4. 选择 **"Redirect to dechat.com"**

### 5.2 主域名重定向到 www

如果您希望 dechat.com 自动重定向到 www.dechat.com:

1. 在 Vercel Domains 设置中
2. 找到 dechat.com 域名
3. 点击右侧的 **"..."** 菜单
4. 选择 **"Redirect to www.dechat.com"**

## 🔍 常见问题

### Q1: DNS 配置后域名无法访问?

**可能原因**:
- DNS 记录还未生效,需要等待传播
- DNS 记录配置错误
- Vercel 域名验证失败

**解决方案**:
1. 使用 `nslookup` 或 `dig` 检查 DNS 解析
2. 确认阿里云 DNS 记录配置正确
3. 在 Vercel 中点击 "Refresh" 重新验证

### Q2: 显示 "Invalid Configuration" 错误?

**可能原因**:
- DNS 记录类型或值不正确
- TTL 设置过长导致更新缓慢

**解决方案**:
1. 检查 DNS 记录是否与 Vercel 要求一致
2. 将 TTL 设置为较小的值(如 600)
3. 清除本地 DNS 缓存: `ipconfig /flushdns` (Windows) 或 `sudo dscacheutil -flushcache` (Mac)

### Q3: SSL 证书未自动配置?

**可能原因**:
- 域名验证未完成
- Vercel 自动证书申请失败

**解决方案**:
1. 确保域名 DNS 已正确配置并生效
2. 等待 10-30 分钟让 Vercel 重新尝试
3. 如果仍然失败,联系 Vercel 支持

### Q4: 同时使用多个域名?

可以为同一个项目配置多个域名:
- dechat.com (主域名)
- www.dechat.com (www 子域名)
- app.dechat.com (应用子域名)
- api.dechat.com (API 子域名)

每个域名都需要单独配置 DNS 记录。

## 📊 DNS 配置总结

### 阿里云 DNS 记录配置表

| 记录类型 | 主机记录 | 记录值 | TTL | 用途 |
|---------|---------|--------|-----|------|
| CNAME | @ | cname.vercel-dns.com | 600 | 主域名指向 Vercel |
| CNAME | www | cname.vercel-dns.com | 600 | www 子域名指向 Vercel |

### Vercel 域名配置清单

- [ ] 添加 dechat.com 到 Vercel 项目
- [ ] 添加 www.dechat.com 到 Vercel 项目
- [x] 配置阿里云主域名 CNAME 记录
- [x] 配置阿里云 www CNAME 记录
- [ ] 等待 DNS 传播
- [ ] 验证域名在 Vercel 中显示为 Active
- [ ] 验证 SSL 证书自动配置
- [ ] 测试访问 https://dechat.com
- [ ] 测试访问 https://www.dechat.com
- [ ] 配置域名重定向(可选)

## 🚀 下一步

域名配置完成后:

1. ✅ 更新项目文档中的域名链接
2. ✅ 在社交媒体和营销材料中使用新域名
3. ✅ 配置 Google Analytics 或其他分析工具
4. ✅ 提交网站到搜索引擎(Google Search Console)
5. ✅ 配置 SEO 元数据

## 📞 需要帮助?

如果在配置过程中遇到问题:

1. **Vercel 文档**: https://vercel.com/docs/custom-domains
2. **阿里云文档**: https://help.aliyun.com/document_detail/106535.html
3. **GitHub Issues**: https://github.com/everest-an/dchat/issues

---

**最后更新**: 2025-10-20 03:15 GMT+8
**状态**: DNS 已配置,等待传播
**配置方式**: CNAME 记录(推荐)
**预计生效时间**: 10-30 分钟

