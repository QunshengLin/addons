# -*- coding: utf-8 -*-
import json
from . import models

def post_init_hook(env):
    """
    安装模块后自动创建配置项，ICP+公安备案打包为JSON存入单个系统参数
    """
    ICP = env["ir.config_parameter"]
    key_name = "cn_icp.config"
    if not ICP.search([("key", "=", key_name)]):
        cfg = {
            "public_security_number": "",  # 公安备案号
            "number": ""                   # ICP备案号
        }
        ICP.create({
            "key": key_name,
            "value": json.dumps(cfg, ensure_ascii=False, indent=2)
        })
