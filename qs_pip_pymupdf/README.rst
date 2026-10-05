QS PyMuPDF PDF Report Enhancement Module
========================================

.. code-block:: shell

sudo /usr/bin/python3 -m pip install PyMuPDF==1.26.7 --break-system-packages

This module extends Odoo 20 native reporting model `ir.actions.report` based on PyMuPDF.
It supports PDF generation, high-definition PDF-to-PNG conversion, social OG sharing preview and report action selection popup.

Features

---

Add 4 output modes for QWeb PDF reports:

1. **Print**: Generate PDF on the backend and trigger browser print dialog
2. **Download**: Use Odoo native PDF download logic
3. **Open**: Preview PDF in a new browser tab
4. **OG Render**: Convert PDF pages to high-resolution PNG images and preview in popup. The page embeds OG meta tags for social sharing cards.

Highlights

---

- Directly convert reports into images. On mobile devices, long press to share via browser to other apps easily, no need to save images locally to album first.
- Configure **default printing option** directly on the report form.
- Embed base64 images in the page with OG meta tags to generate preview cards for social platforms.
- Safety protection: 60-second render timeout and maximum 50MB file limit to prevent server freeze.
- OWL3 frontend popup, fully compatible with Odoo 20 new report handler architecture.

Backend Python (ir.actions.report Extension)

---

- New field `default_print_option` to preset report behavior: `print / download / open / og_render`
- `_safe_render_pdf`: Add timeout and file size validation, unified exception capture and log output.
- `_pdf_to_png_optimized`: Convert PDF binary stream to images directly **without temporary disk files**. Default 2x scaling and 150 DPI, return base64 strings for all pages. Automatically release documents to avoid handle leakage.
- RPC method `fitz_pdf_image()`: Frontend ORM call entry with parameter validation, access permission check and exception handling.
- Override `report_action` and `_get_readable_fields` to pass custom settings to frontend.

Frontend OWL3 JS (Odoo20 Web)

---

- Intercept `qweb-pdf` report actions; bypass non-PDF reports without breaking original logic.
- `ReportDialogWindow` OWL3 popup component, supports ESC key to close.
- Skip popup and run action directly if default printing option is set on report.
- OG Render preview uses iframe popup with adaptive multi-page image display. Close button cleans up DOM nodes to prevent memory leaks.
- Reuse single iframe instance for printing to reduce DOM resource consumption.
- Detect PDF engine status via new endpoint `/report/get_pdf_engine_state`, auto fallback to HTML report preview if PDF engine fails.

Dependencies

---

- Python package: `pymupdf >=1.24` (auto compatible with old fitz import syntax)
- Odoo Version: **Odoo 20 (OWL3)**
- Odoo required modules: `web`, `base`

.. code-block:: shell

pip install pymupdf

Usage

---

1. Configure default report behavior
Go to Settings > Technical > Reports, open QWeb PDF report and set the field `Default printing option`.
Leave empty to show selection popup every time users click the report.
2. OG Render PDF to image preview
Click print on document → select OG Render.
Backend renders PDF and converts it to PNG. Popup displays all pages with OG sharing meta information.
3. Print function
Select Print. PDF loads inside hidden iframe then triggers browser print dialog.
4. Engine fallback mechanism
If PDF rendering engine is unavailable, system automatically switches to HTML report preview.

Security & Limitations

---

- Max PDF file size: 50MB
- PDF rendering timeout limit: 60 seconds
- Base64 images increase data transmission volume, suitable for short documents such as invoices and contracts
- Image conversion runs on server side, sufficient server memory is required
- Read permission validation is enforced when accessing reports

Module File Structure

---

::

qs_pip_pymupdf/
├── **init**.py
├── **manifest**.py
├── models/
│   └── ir_actions_report.py
├── static/
│   └── src/js/
│       ├── report_handler.js
│       └── report_dialog.js
├── views/
│   └── report_assets.xml
└── README.rst

Changelog

---

V20.0.1.0.0

```
- Adapted for Odoo 20 with OWL3 frontend components
- Support four report actions: Print / Download / Open / OG Render
- High-definition PDF to PNG conversion powered by PyMuPDF
- Generate OG and social sharing meta tags
- Add PDF render timeout and file size restrictions
- Auto fallback to HTML preview when PDF engine fails
- Single iframe optimization to reduce memory footprint

FAQ
---
- Q: No image preview after selecting OG Render?
  A: Confirm pymupdf installed successfully, check Odoo server logs for conversion errors.

- Q: Preview image looks blurry?
  A: Adjust scaling matrix `Matrix(2.0,2.0)` and DPI in `_pdf_to_png_optimized`. Larger values create bigger base64 payload.

- Q: Social platforms cannot display OG preview image?
  A: Most social platforms do not support base64 images for OG cards. For production sharing, upload images to publicly accessible static URLs.

如果你需要，我可以单独提取一段简短英文，放到 `__manifest__.py` 的 summary / description 字段。
```

 这个模块的具体功能有哪些？

 如何使用这个模块？

 这个模块的优势是什么？

QS PyMuPDF PDF 报表增强模块
===========================

.. code-block:: sudo /usr/bin/python3 -m pip install PyMuPDF==1.26.7 --break-system-packages

本模块基于 PyMuPDF 扩展 Odoo 20 原生报表模型 `ir.actions.report`，支持 PDF 生成、PDF 转高清 PNG 图片、社交 OG 分享预览、报表操作选择弹窗。

功能介绍

---

为 QWeb PDF 报表新增 4 种输出模式：

1. **Print（直接打印）**：后端生成 PDF，唤起浏览器打印弹窗
2. **Download（下载文件）**：沿用 Odoo 原生 PDF 下载逻辑
3. **Open（新窗口打开 PDF）**：在浏览器新标签预览 PDF
4. **OG Render（PDF 转图片预览）**：PDF 页面转为高清 PNG，弹窗预览；页面内置 OG / 元标签，用于社交分享卡片

核心亮点

```
- 报表直接转图片，移动端长按触发浏览器分享到其他APP，方便，无需保存本地相册再发。
- 可直接在报表表单配置**默认打印选项**
- 图片以base64内嵌页面，附带OG元标签，实现社交平台预览卡片
- 安全防护：60秒渲染超时、最大50MB文件限制，防止服务卡死
- OWL3前端弹窗，完全兼容Odoo20新版报表处理器架构

后端 Python（ir.actions.report 扩展）
--------------------------------------
- 新增字段 ``default_print_option``，预设报表行为：``print / download / open / og_render``
- ``_safe_render_pdf``：增加超时与文件大小校验，统一异常捕获与日志输出
- ``_pdf_to_png_optimized``：直接读取PDF二进制流转图片，**无需生成临时磁盘文件**。默认2倍缩放、150DPI，返回全部页面base64；自动释放文档，避免句柄泄漏
- RPC接口 ``fitz_pdf_image()``：前端ORM调用入口，自带参数校验、权限校验与异常捕获
- 重写 ``report_action`` 和 ``_get_readable_fields``，将自定义配置传递到前端

前端 OWL3 JS（Odoo20 Web）
---------------------------
- 拦截 ``qweb-pdf`` 报表动作；非PDF报表直接放行，不影响原有逻辑
- ``ReportDialogWindow`` OWL3弹窗组件，支持ESC快捷键关闭
- 报表预设默认选项时，**跳过弹窗直接执行**
- OG Render预览使用iframe弹窗，页面自适应展示多页图片；关闭按钮清理DOM，防止内存泄漏
- 打印功能复用单例iframe，减少DOM资源占用
- 通过新接口 ``/report/get_pdf_engine_state`` 检测PDF引擎状态，引擎异常自动降级为HTML报表

模块依赖
--------
* Python包：``pymupdf >=1.24``（自动兼容旧版fitz导入写法）
* Odoo版本：**Odoo 20（OWL3）**
* Odoo依赖模块：``web``、``base``

.. code-block:: shell

    pip install pymupdf

使用说明
--------
1. 配置报表默认行为
    进入 设置 > 技术 > 报表，打开QWeb PDF报表，设置「Default printing option」。
    留空则每次点击报表弹出操作选择弹窗。

2. OG Render PDF转图片预览
    单据点击打印 → 选择 OG Render。
    后端渲染PDF并转换成PNG，弹窗展示全部页面，页面自带OG/分享元信息。

3. 打印功能
    选择Print，PDF加载至隐藏iframe后唤起浏览器打印。

4. 引擎降级机制
    PDF渲染引擎不可用时，自动切换为HTML报表预览。

安全与限制
----------
- PDF文件上限：50MB
- PDF渲染超时限制：60秒
- Base64图片会增大传输数据量，适合发票、合同这类短报表
- 图片转换在服务端执行，服务器需要充足内存
- 访问报表时会校验报表读取权限

模块文件结构
------------
::

    qs_pip_pymupdf/
    ├── __init__.py
    ├── __manifest__.py
    ├── models/
    │   └── ir_actions_report.py
    ├── static/
    │   └── src/js/
    │       ├── report_handler.js
    │       └── report_dialog.js
    ├── views/
    │   └── report_assets.xml
    └── README.rst

更新日志
--------
V20.0.1.0.0
```

- 适配 Odoo20，使用 OWL3 前端组件
- 支持 4 种报表动作：Print / Download / Open / OG Render
- PyMuPDF 高清 PDF 转 PNG
- 生成 OG、社交分享元标签
- 增加 PDF 渲染超时、文件大小限制
- PDF 引擎异常自动降级 HTML 预览
- 单例 iframe 优化，降低内存占用

常见问题

---

- Q：选择 OG Render 后看不到图片预览？
A：确认 pymupdf 安装成功，查看 Odoo 服务日志，排查转换报错。
- Q：预览图片比较模糊？
A：在 `_pdf_to_png_optimized` 调整 `Matrix(2.0,2.0)` 缩放系数和 DPI；数值越大，base64 体积越大。
- Q：社交平台 OG 卡片无法展示图片？
A：多数平台不支持 base64 格式图片作为 OG 图片。正式线上分享需要将图片上传至公网可访问静态地址。