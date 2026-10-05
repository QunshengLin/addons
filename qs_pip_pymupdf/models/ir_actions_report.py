# -*- coding: utf-8 -*-
import base64
import logging
import time
from contextlib import contextmanager
from typing import Tuple

try:
    import pymupdf  # PyMuPDF >= 1.24 的新导入方式（fitz 已弃用）
except ImportError:  # 兼容旧版本 PyMuPDF
    import fitz as pymupdf
from odoo import fields, models
from odoo.exceptions import UserError, AccessError

_logger = logging.getLogger(__name__)


class IrActionsReportXml(models.Model):
    _inherit = "ir.actions.report"

    default_print_option = fields.Selection(
        selection=[
            ("print", "Print"),
            ("download", "Download"),
            ("open", "Open"),
            ("og_render", "OG Render"),
        ],
        string="Default printing option",
    )

    def _get_readable_fields(self):
        """
        1.重写父类方法，扩展报表可读字段集合
        2.将自定义的默认打印选项字段加入可读字段
        3.保证前端可正常获取该字段值
        4.返回整合后的所有可读字段

        :return: 报表可读字段集合
        :rtype: set
        """
        data = super()._get_readable_fields()
        data.add("default_print_option")
        return data

    def report_action(self, docids, data=None, config=True):
        """
        1.重写报表动作生成方法
        2.继承父类基础报表动作逻辑
        3.添加报表ID和默认打印选项到返回数据
        4.前端根据配置执行对应打印/下载/打开操作

        :param docids: 报表关联单据ID列表
        :type docids: list
        :param data: 报表渲染附加数据
        :type data: dict, optional
        :param config: 是否使用配置参数
        :type config: bool, optional
        :return: 报表动作数据字典
        :rtype: dict
        """
        data = super().report_action(docids, data, config)
        data["id"] = self.id
        data["default_print_option"] = self.default_print_option
        return data

    @contextmanager
    def _timeout_control(self, timeout: int, error_msg: str):
        """
        1.超时控制上下文管理器
        2.监控代码块执行时间
        3.超过指定时间抛出超时异常
        4.用于防止PDF生成卡死

        :param int timeout: 超时时间（秒）
        :param str error_msg: 超时异常提示信息
        :return: 上下文管理器
        :rtype: contextmanager
        """
        start_time = time.time()
        yield
        if time.time() - start_time > timeout:
            raise TimeoutError(error_msg)

    def _safe_render_pdf(
        self,
        report: models.Model,
        report_name: str,
        doc_ids: list,
        data: dict,
        context: dict,
    ) -> bytes:
        """
        1.安全生成PDF报表内容
        2.添加超时控制，防止生成超时
        3.校验PDF文件大小，超过50MB报错
        4.统一异常处理，返回标准错误提示
        5.返回生成的PDF二进制内容

        :param report: 报表记录对象
        :type report: ir.actions.report
        :param str report_name: 报表技术名称
        :param list doc_ids: 单据ID列表
        :param dict data: 报表渲染数据
        :param dict context: 执行上下文
        :return: PDF二进制内容
        :rtype: bytes
        """
        try:
            with self._timeout_control(
                60,
                f"PDF生成超时60秒）：{report_name}",
            ):
                report_with_context = (
                    report.with_context(**context) if context else report
                )
                pdf_render_result = report_with_context._render_qweb_pdf(
                    report_name, res_ids=doc_ids, data=data or {}
                )
                pdf_content = (
                    pdf_render_result[0]
                    if isinstance(pdf_render_result, tuple)
                    else pdf_render_result
                )
                pdf_size_mb = len(pdf_content) / (1024 * 1024)
                if pdf_size_mb > 50:
                    raise UserError(f"PDF文件过大（{pdf_size_mb:.2f}MB），最大支持50MB")
                if not pdf_content:
                    raise UserError("PDF生成失败：空内容")
                return pdf_content
        except TimeoutError as e:
            _logger.error(f"PDF生成超时 -> 报表:{report_name}")
            raise UserError(str(e))
        except Exception as e:
            _logger.error(f"PDF生成失败 -> {str(e)}", exc_info=True)
            raise UserError(f"PDF生成错误：{str(e)}")

    @staticmethod
    def _pdf_to_png_optimized(pdf_content: bytes) -> Tuple[list, int, int, int]:
        """
        1.优化版PDF转PNG图片方法
        2.使用PyMuPDF高效转换，提升速度
        3.按配置比例缩放图片，保证清晰度
        4.逐页转换PDF，返回所有页面图片
        5.返回图片尺寸、页数等元数据
        6.转换完成自动关闭PDF文档

        :param bytes pdf_content: PDF二进制内容
        :return: 图片字节列表、宽度、高度、总页数
        :rtype: Tuple[list, int, int, int]
        """
        pdf_doc = None
        try:
            pdf_doc = pymupdf.open(stream=pdf_content, filetype="pdf")
            page_count = len(pdf_doc)
            mat = pymupdf.Matrix(2.0, 2.0)
            width = 0
            height = 0
            pages_bytes = []
            for page_index in range(page_count):
                page = pdf_doc[page_index]
                pix = page.get_pixmap(
                    matrix=mat,
                    alpha=False,
                    dpi=150,
                    annots=False,
                    clip=False,
                )
                img_bytes = pix.tobytes("png")
                pages_bytes.append(img_bytes)
                if page_index == 0:
                    width = pix.width
                    height = pix.height
            return pages_bytes, width, height, page_count
        except Exception as e:
            _logger.error(f"QS:PDF-PNG error → {str(e)}", exc_info=True)
            raise UserError(f"PDF转图片错误：{str(e)}")
        finally:
            if pdf_doc and not pdf_doc.is_closed:
                pdf_doc.close()

    def fitz_pdf_image(self, *args, **kwargs):
        """
        1.报表PDF转图片核心对外接口
        2.支持位置参数和关键字参数调用
        3.参数校验：报表名称、单据ID合法性
        4.权限校验：报表读取权限校验
        5.生成PDF并转换为PNG图片
        6.返回图片Base64、尺寸、页数等数据
        7.统一异常处理，返回友好提示

        :param args: 位置参数：[报表名称, 单据ID列表, 渲染数据, 上下文]
        :param kwargs: 关键字参数：report_name, doc_ids, data, context
        :return: 图片数据字典（base64、尺寸、页数等）
        :rtype: dict
        """
        report_name = args[0] if len(args) >= 1 else kwargs.get("report_name")
        doc_ids = args[1] if len(args) >= 2 else kwargs.get("doc_ids", [])
        data = args[2] if len(args) >= 3 else kwargs.get("data")
        context = args[3] if len(args) >= 4 else kwargs.get("context", {})
        try:
            if isinstance(doc_ids, str):
                doc_ids = [
                    int(id_str.strip())
                    for id_str in doc_ids.split(",")
                    if id_str.strip().isdigit()
                ]
            doc_ids = doc_ids if isinstance(doc_ids, list) else []
            doc_ids = [int(doc_id) for doc_id in doc_ids if doc_id]
        except Exception as e:
            raise UserError(f"单据ID格式错误：{str(e)}")

        if not report_name:
            raise UserError("参数错误：报表名称不能为空")
        if not doc_ids:
            raise UserError("参数错误：单据ID列表不能为空")
        try:
            report = self.env["ir.actions.report"]._get_report_from_name(report_name)
            if not report:
                raise UserError(f"报表不存在：{report_name}")
            model_name = report.model
            if not model_name:
                raise UserError(f"报表{report_name}未配置关联模型")
            report.check_access("read")
            img_pages_bytes, width, height, page_count = self._pdf_to_png_optimized(
                self._safe_render_pdf(report, report_name, doc_ids, data, context)
            )
            base64_list = []
            for img_bytes in img_pages_bytes:
                b64 = base64.b64encode(img_bytes).decode("utf-8")
                base64_list.append(b64)

            first_page_base64 = base64_list[0] if base64_list else ""
            return {
                "base64": first_page_base64,
                "base64_pages": base64_list,
                "format": "png",
                "width": width,
                "height": height,
                "page_count": page_count,
                "report_name": report_name,
                "from_cache": False,
            }
        except AccessError as e:
            raise UserError(f"权限不足：{str(e)}")
        except TimeoutError as e:
            raise UserError(str(e))
        except UserError as e:
            raise e
        except Exception as e:
            _logger.error(f"QS:PDF-Image error → {str(e)}", exc_info=True)
            raise UserError(f"处理失败：{str(e)}")
