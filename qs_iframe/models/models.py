import json

from odoo import models, fields
from odoo import models, api


class IframeList(models.Model):
    _name = "qs.iframe"
    _description = "Iframe List"
    _order = "sequence, id"

    sequence = fields.Integer(string="Sequence", default=10)
    name = fields.Char(string="Name", required=True)
    url = fields.Char(string="URL", required=True)
    active = fields.Boolean(string="Active", default=True)
    color = fields.Integer(string="Color")


# 思维导图默认模板数据，simple‑mind‑map初始结构
DEFAULT_MIND_DATA = {
    "root": {"data": {"text": "主题中心"}, "children": []},
    "theme": {"template": "avocado", "config": {}},
    "layout": "logicalStructure",
    "config": {},
    "view": None,
}


class MindMap(models.Model):
    _name = "qs.mind.map"
    _description = "Mind Map"

    # 思维导图名称
    name = fields.Char(string="Name", default="Untitled MindMap")
    # 思维导图主体节点JSON数据，存储根节点、子节点树结构
    mind_data = fields.Json(string="Mind Data", default=DEFAULT_MIND_DATA)
    # 思维导图主题、布局配置参数
    mind_config = fields.Json(string="Mind Config", default={})
    # 界面语言标识
    lang = fields.Char(string="Language", default="zh")
    # 浏览器本地状态缓存配置
    local_config = fields.Json(string="Local Config", default={})
    # Excalidraw白板画布数据：{elements: [...], files: {fileId: base64资源}}
    excalidraw_data = fields.Json(
        string="Excalidraw Data", default=lambda self: {"elements": [], "files": {}}
    )
    active = fields.Boolean(string="Active", default=True)
    color = fields.Integer(string="Color")
    sequence = fields.Integer(string="Sequence", default=10)

    @staticmethod
    def _parse_json(value):
        """
        JSON通用解析工具
        :param value: dict | str | None 原始值
        :return: dict | None 解析后字典，解析失败返回None
        """
        if not value:
            return None
        if isinstance(value, dict):
            return value
        try:
            return json.loads(value)
        except (ValueError, TypeError):
            return None

    def get_mindmap_data(self):
        """
        RPC对外接口：读取思维导图完整数据，适配前端驼峰字段
        :return: dict 格式化后脑图数据，供iframe前端消费
        """
        self.ensure_one()
        mind_data = self._parse_json(self.mind_data) or DEFAULT_MIND_DATA
        return {
            "mindMapData": mind_data,
            "mindMapConfig": self._parse_json(self.mind_config) or {},
            "lang": self.lang or "zh",
            "localConfig": self._parse_json(self.local_config) or {},
        }

    def set_mindmap_data(self, mind_map_data):
        """
        RPC对外接口：保存前端传回思维导图数据
        :param mind_map_data: dict 前端提交驼峰格式完整对象
        传入None/缺失的字段不覆盖数据库已有值
        """
        self.ensure_one()
        mind_data = mind_map_data.get("mindMapData")
        if mind_data is None:
            mind_data = self._parse_json(self.mind_data) or DEFAULT_MIND_DATA
        mind_map_config = mind_map_data.get("mindMapConfig")
        if mind_map_config is None:
            mind_map_config = self._parse_json(self.mind_config) or {}
        local_config = mind_map_data.get("localConfig")
        if local_config is None:
            local_config = self._parse_json(self.local_config) or {}
        lang = mind_map_data.get("lang") or self.lang or "zh"

        self.write(
            {
                "mind_data": json.dumps(mind_data, ensure_ascii=False),
                "mind_config": json.dumps(mind_map_config, ensure_ascii=False),
                "lang": lang,
                "local_config": json.dumps(local_config, ensure_ascii=False),
            }
        )

    def get_excalidraw_data(self):
        """
        RPC对外接口：读取白板画布数据
        :return: dict {elements: [...], files: {...}}
        """
        self.ensure_one()
        data = self._parse_json(self.excalidraw_data) or {}
        return {
            "elements": data.get("elements") or [],
            "files": data.get("files") or {},
        }

    def set_excalidraw_data(self, data):
        """
        RPC对外接口：保存白板画布数据
        :param data: dict {elements: [...], files: {fileId: {...}}}
        """
        self.ensure_one()
        self.write(
            {
                "excalidraw_data": json.dumps(
                    {
                        "elements": data.get("elements") or [],
                        "files": data.get("files") or {},
                    },
                    ensure_ascii=False,
                )
            }
        )

    def action_open_mindmap_iframe(self):
        """
        表单按钮Action：打开Owl Iframe思维导图组件
        依赖调用方环境context自动携带active_model、active_id
        """
        return {
            "type": "ir.actions.client",
            "tag": "qs_iframe.iframe_mind",
            "target": "current",
            "context": {
                "display_name": self.display_name,
            },
        }

    def action_open_excalidraw_iframe(self):
        """
        表单按钮Action：打开Owl excalidraw
        依赖调用方环境context自动携带active_model、active_id
        """
        return {
            "type": "ir.actions.client",
            "tag": "qs_iframe.excalidraw",
            "target": "current",
            "context": {
                "display_name": self.display_name,
            },
        }
