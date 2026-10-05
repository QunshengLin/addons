/** @odoo-module **/
import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
import { ReportDialogWindow } from "./report_dialog_window";
import { rpc } from "@web/core/network/rpc";

// Odoo20 中 wkhtmltopdf 检测接口已替换为通用 PDF 引擎状态接口
function getPdfEngineMessages(status) {
    const statusMsgMap = {
        broken: _t("Your installation of PDF engine seems to be broken, check with the administrator. The report will be shown in html."),
        install: _t("Unable to find the PDF engine on this system. The report will be shown in html."),
        upgrade: _t("You should upgrade your version of the PDF engine in order to get a correct render it."),
        workers: _t("You need to start Odoo with at least two workers to print a pdf version of the reports.")
    };
    return statusMsgMap[status];
}

// 全局复用PDF打印的iframe，避免重复创建DOM节点
let iframeForReport = null;

/**
 * 调用浏览器打印功能打印PDF文件，单例iframe模式，优化性能和内存占用
 * @param {String} url PDF文件访问地址
 * @param {Function} callback 打印完成后的回调函数
 */
function printPdf(url, callback) {
    let iframe = iframeForReport;
    if (!iframe) {
        iframe = iframeForReport = document.createElement('iframe');
        iframe.className = 'PDF iframe';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        // 加载完成后执行打印，延时确保内容渲染完毕
        iframe.onload = () => {
            setTimeout(() => {
                iframe.focus();
                iframe.contentWindow.print();
                URL.revokeObjectURL(url);
                callback?.();
            }, 1);
        };
    }
    iframe.src = url;
}

/**
 * 拼接生成报表的访问URL，兼容带参数/纯ID两种传参模式，适配PDF/HTML两种报表类型
 * @param {Object} action 报表动作对象
 * @param {String} type 报表类型 pdf/html
 * @param {Object} [userContext] 用户上下文（HTML报表需要）
 * @returns {String} 拼接完成的报表访问URL
 */
function getReportUrl(action, type, userContext) {
    let url = `/report/${type}/${action.report_name}`;
    const actionContext = action.context || {};
    const actionData = action.data || {};

    if (Object.keys(actionData).length > 0) {
        const options = encodeURIComponent(JSON.stringify(actionData));
        const context = encodeURIComponent(JSON.stringify(actionContext));
        url += `?options=${options}&context=${context}`;
    } else {

        if (actionContext.active_ids) {
            url += `/${actionContext.active_ids.join(",")}`;
        }
        if (type === "html") {
            const context = encodeURIComponent(JSON.stringify(userContext || {}));
            url += `?context=${context}`;
        }
    }
    return url;
}

/**
 * 核心方法：执行PDF转图片渲染，生成带OG/微信标签的预览窗口，支持社交分享
 * @param {Object} action 报表动作对象
 * @param {String} type 报表类型
 * @param {Object} env Odoo全局环境对象
 */
async function renderOgReport(action, type, env) {
    try {
        env.services.ui.block();
        // 提取报表核心参数，标准化数据格式
        const getReportInfo = (action) => {
            const actionContext = action.context || {};
            const activeIds = actionContext.active_ids || [];
            const orderId = activeIds[0] || '';
            const orderName = orderId ? `Order${orderId}` : 'Sale Order';
            return {
                report_name: action.report_name || '',
                doc_ids: activeIds,
                data: action.data || {},
                context: actionContext,
                order_id: orderId,
                order_name: orderName
            };
        };

        const reportInfo = getReportInfo(action);
        // 必填参数校验
        if (!reportInfo.report_name) throw new Error(_t("The report name cannot be empty."));
        if (reportInfo.doc_ids.length === 0) throw new Error(_t("Please select the document you need to convert."));

        // 调用后端ORM方法执行PDF转图片
        const imageResult = await env.services.orm.call(
            "ir.actions.report",
            "fitz_pdf_image",
            [[]],
            {
                report_name: reportInfo.report_name,
                doc_ids: reportInfo.doc_ids,
                data: reportInfo.data,
                context: reportInfo.context
            }
        );

        if (imageResult && imageResult.base64) {
            // 移除旧的预览窗口，避免DOM节点冗余
            const existingIframe = document.getElementById('report-image-iframe');
            const existingCloseBtn = document.getElementById('close-report-iframe');
            existingIframe && existingIframe.remove();
            existingCloseBtn && existingCloseBtn.remove();
            // 创建预览iframe和关闭按钮
            const reportIframe = document.createElement('iframe');
            reportIframe.id = 'report-image-iframe';
            reportIframe.title = _t("Report image preview");
            reportIframe.style.cssText = `position: fixed;top: 10%;left: 10%;width: 80%;height: 80%;border: none;border-radius: 12px;box-shadow: 0 8px 30px rgba(0,0,0,0.2);z-index: 9999;background: white;`;

            const closeBtn = document.createElement('button');
            closeBtn.id = 'close-report-iframe';
            closeBtn.innerText = '×';
            closeBtn.style.cssText = `position: fixed;top: 8%;right: 9%;width: 40px;height: 40px;border-radius: 50%;background: #dc3545;color: white;border: none;font-size: 24px;cursor: pointer;z-index: 10000;display: flex;align-items: center;justify-content: center;box-shadow: 0 4px 10px rgba(0,0,0,0.2);`;
            closeBtn.onclick = () => {
                reportIframe.remove();
                closeBtn.remove();
            };

            // 计算图片大小、标准化语言格式
            const userLang = (env.services.user?.lang || 'zh-CN').replace('_', '-');
            const imageSizeKB = (imageResult.base64.length * 0.75 / 1024).toFixed(2);

            // 拼接带OG/微信标签的HTML内容，支持社交平台分享卡片渲染
            const htmlContent = `
                <!DOCTYPE html>
                <html lang="${userLang}">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <meta property="og:title" content="${reportInfo.order_name} - PDF preview" />
                    <meta property="og:description" content="Sale Order${reportInfo.order_id}PDF to image conversion, size:${imageSizeKB}KB, Page Count:${imageResult.page_count || 1}" />
                    <meta property="og:type" content="article" />
                    <meta property="og:url" content="${window.location.origin}/sale/order/${reportInfo.order_id}" />
                    <meta property="og:image" content="data:image/png;base64,${imageResult.base64}" />
                    <meta property="og:image:width" content="${imageResult.width || 1200}" />
                    <meta property="og:image:height" content="${imageResult.height || 630}" />
                    <meta property="og:image:type" content="image/png" />
                    <meta property="og:site_name" content="Sale System" />
                    <meta property="wechat:article_title" content="${reportInfo.order_name} - PDF preview" />
                    <meta property="wechat:article_description" content="Sale Order${reportInfo.order_id}Convert PDF to high-definition images" />
                    <meta property="wechat:article_image" content="data:image/png;base64,${imageResult.base64}" />
                    <meta name="wx_appid" content="" />
                    <title>${action.name || _t("PDF to Image Preview")}</title>
                </head>
                <body style="margin:0;padding:10px;background:#f5f5f5;">
                ${imageResult.base64_pages.map((b64, index) => `
    <div style="margin-bottom:20px;">
        <div style="padding:8px; background:#fff; border-radius:8px; margin-bottom:8px; font-size:14px;">
            第 ${index + 1} 页 / 共 ${imageResult.page_count} 页
        </div>
        <img
            src="data:image/png;base64,${b64}"
            style="width:100%;height:auto;border-radius:8px;"
        >
    </div>
`).join('')}
                </body>
                </html>
            `;
            reportIframe.srcdoc = htmlContent;
            document.body.appendChild(reportIframe);
            document.body.appendChild(closeBtn);
        } else {
            env.services.notification.add(_t("Failed to obtain image data, conversion failed"), {
                type: "warning",
                sticky: true
            });
        }
    } catch (error) {
        console.error("[PDF Conversion to Image Failed]：", error);
        env.services.notification.add(
            _t("PDF conversion to image failed:") + (error.message || _t("unknown error")),
            { type: "danger", sticky: true }
        );
    } finally {
        env.services.ui.unblock();
    }
}

// 单例模式缓存PDF引擎检测状态，避免重复请求（Odoo20：/report/check_wkhtmltopdf 已替换为 /report/get_pdf_engine_state）
let pdfEngineStateProm = null;

/**
 * Odoo报表核心处理器 - 注册到报表处理器注册表，优先级10
 * 核心能力：拦截PDF报表动作，实现打印/下载/打开/图片转换 四合一选择弹窗，适配默认配置项
 */
registry.category("ir.actions.report handlers").add("pdf_report_options_handler", async function (action, options, env) {
    const { default_print_option, report_type } = action;
    // Odoo20 支持 qweb-pdf-<engine> 多引擎报表类型，非PDF报表直接放行，不拦截
    if (!String(report_type || "").startsWith("qweb-pdf")) return false;
    // 下载模式直接放行，使用Odoo原生下载逻辑
    if (default_print_option === "download") return false;

    let select_option = default_print_option;
    // 无默认配置时，弹出选择弹窗
    if (!select_option) {
        let removeDialog;
        select_option = await new Promise(resolve => {
            removeDialog = env.services.dialog.add(ReportDialogWindow, {
                onSelectOption: (opt) => resolve(opt)
            }, {
                onClose: () => resolve(false)
            });
        });
        removeDialog();
        // 关闭弹窗/无选择项时终止执行
        if (!select_option) return true;
        // 选择下载时放行原生逻辑
        if (select_option === "download") return false;
        // 选择图片转换时执行OG渲染逻辑
        if (select_option === "og_render") {
            await renderOgReport(action, "pdf", env);
            return true;
        }
    }

    // 解析 qweb-pdf-<engine> 中的引擎名称
    let engineName;
    if (report_type.startsWith("qweb-pdf-")) {
        engineName = report_type.slice("qweb-pdf-".length);
    }
    // 检测PDF引擎状态，单例缓存结果
    if (!pdfEngineStateProm) {
        pdfEngineStateProm = rpc("/report/get_pdf_engine_state", engineName ? { engine_name: engineName } : {});
    }
    const state = await pdfEngineStateProm;
    const message = getPdfEngineMessages(state);
    // 环境异常时弹出提示
    if (message) {
        env.services.notification.add(message, { sticky: true, title: _t("Report") });
    }

    // 环境正常时，执行打印/打开逻辑
    if (["upgrade", "ok"].includes(state)) {
        const url = getReportUrl(action, "pdf");
        if (select_option === "print") {
            env.services.ui.block();
            printPdf(url, () => env.services.ui.unblock());
        }
        if (select_option === "open") {
            window.open(url);
        }
        return true;
    } else {
        // 环境异常时，降级为HTML报表展示
        // Odoo20 中 report.html 客户端动作 tag 已不再注册，需通过 doAction 以 qweb-html 类型重新分发
        env.services.action.doAction({ ...action, report_type: "qweb-html" }, options);
        return true;
    }
}, { sequence: 10 });