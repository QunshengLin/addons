from odoo import models, api


class IrQWeb(models.AbstractModel):
    _inherit = "ir.qweb"

    @api.model
    def _render(self, template=None, values=None, **options):
        """
        继承这个模型这个方法，加入功能返回原生方法
        截取 登录页 + 外部网站 网页  模板
        获取系统参数设置的备案号等  往模板添加
        """
        if isinstance(template, str):
            if template in ["web.login", "web.login_layout"] or template.startswith(
                "website."
            ):
                if values is None:
                    values = {}
                icp_display_name = (
                    self.env["ir.config_parameter"]
                    .sudo()
                    .get_param("cn_icp.number", "")
                )
                icp_police_number = (
                    self.env["ir.config_parameter"]
                    .sudo()
                    .get_param("cn_icp.public_security_number", "")
                )
                values.update(
                    {
                        "icp_display_name": icp_display_name,
                        "icp_police_number": icp_police_number,
                    }
                )
        return super(IrQWeb, self)._render(template, values, **options)
