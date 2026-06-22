# -*- coding: utf-8 -*-
from . import models


def post_init_hook(env):
    """
    安装模块后自动创建配置项（不存在才创建）
    创建等待添加值 给模板渲染
    公安备案号
    ICP备案号
    """
    ICP = env["ir.config_parameter"]
    if not ICP.search([("key", "=", "cn_icp.public_security_number")]):
        ICP.create({"key": "cn_icp.public_security_number", "value": ""})
    if not ICP.search([("key", "=", "cn_icp.number")]):
        ICP.create({"key": "cn_icp.number", "value": ""})
