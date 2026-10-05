# -*- coding: utf-8 -*-
import json
from odoo import models, api

class IrQWeb(models.AbstractModel):
    _inherit = "ir.qweb"

    @api.model
    def _render(self, template=None, values=None,** options):
        """
        继承ir.qweb，在登录页、网站前台模板注入ICP备案配置
        【新版】读取单个JSON系统参数 cn_icp.config
        """
        if isinstance(template, str):
            # 匹配登录页面 和 website 网站模板
            if template in ["web.login", "web.login_layout"] or template.startswith("website."):
                if values is None:
                    values = {}
                try:
                    cfg = json.loads(self.env["ir.config_parameter"].sudo().get_str("cn_icp.config", "{}"))
                except json.JSONDecodeError:
                    cfg = {}

                values.update({
                    "icp_display_name": cfg.get("number", ""),
                    "icp_police_number": cfg.get("public_security_number", ""),
                })

        return super()._render(template, values, **options)
