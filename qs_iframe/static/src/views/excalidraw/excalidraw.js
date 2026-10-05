/** @odoo-module **/
import {Component, onMounted, onWillUnmount, signal, t, useProps} from "@odoo/owl";
import {registry} from "@web/core/registry";
import {useService} from "@web/core/utils/hooks";
import {standardActionServiceProps} from "@web/webclient/actions/action_plugin";
import {_t} from "@web/core/l10n/translation";

// 桥接页与Odoo同源，由Odoo静态文件服务直接提供，无需控制器
const BRIDGE_URL = "/qs_iframe/static/excalidraw/bridge.html";
const AUTOSAVE_DELAY = 2000;
const BRIDGE_READY_TIMEOUT = 15000;

export class IframeExcalidraw extends Component {
    static template = "qs_iframe.excalidrawPostMessage";

    props = useProps(standardActionServiceProps);

    bridgeUrl = BRIDGE_URL;
    isBridgeReady = signal(false, {type: t.boolean()});
    hasUnsavedChange = signal(false, {type: t.boolean()});
    isSaving = signal(false, {type: t.boolean()});
    display_name = signal("", {type: t.string()});
    iframeRef = signal.ref();

    setup() {
        this.orm = useService("orm");
        this.notificationService = useService("notification");
        this._disposed = false;
        this._loaded = {elements: [], files: {}};   // 数据库基准（上次加载/已保存内容）
        this._pending = null;                        // 待保存的最新画布数据
        this._saveTimer = null;
        this._readyTimer = null;
        this.msgHandler = null;

        this.context = this.props.action.context || {};
        this.active_id = this.context.active_id;
        this.display_name.set(this.context.display_name || "");

        onMounted(() => {
            this.msgHandler = (event) => {
                if (event.source !== this.iframeRef()?.contentWindow) return;
                if (event.origin !== window.location.origin) return;
                const {type, payload} = event.data || {};
                if (type === "EXCALIDRAW_READY") {
                    this.onBridgeReady();
                } else if (type === "EXCALIDRAW_UPDATE") {
                    this.onSceneUpdate(payload);
                }
            };
            window.addEventListener("message", this.msgHandler);

            // CDN不可达时桥接页永远不会ready，超时给出提示
            this._readyTimer = setTimeout(() => {
                if (!this._disposed && !this.isBridgeReady()) {
                    this.notificationService.add(
                        _t("Excalidraw bridge failed to load in time, please check network access to unpkg.com"),
                        {title: _t("Excalidraw"), type: "warning"}
                    );
                }
            }, BRIDGE_READY_TIMEOUT);
        });

        onWillUnmount(() => {
            this._disposed = true;
            this._clearTimers();
            this._flushSave();
            if (this.msgHandler) {
                window.removeEventListener("message", this.msgHandler);
                this.msgHandler = null;
            }
        });
    }

    async onBridgeReady() {
        this.isBridgeReady.set(true);
        await this._pushScene();
    }

    // 首次打开/手动刷新：从数据库读画布数据下发给桥接页渲染
    async _pushScene() {
        if (!this.active_id) {
            console.warn("[qs_iframe] no active_id in action context, skip scene load");
            return;
        }
        try {
            const data = await this.orm.call("qs.mind.map", "get_excalidraw_data", [this.active_id]);
            this._loaded = {elements: data.elements || [], files: data.files || {}};
            this._pending = null;
            this.hasUnsavedChange.set(false);
            this._postToBridge({type: "EXCALIDRAW_LOAD_SCENE", payload: this._loaded});
        } catch (err) {
            console.error("[qs_iframe] failed to load excalidraw data:", err);
            this.notificationService.add(_t("Failed to load drawing"), {title: String(err), type: "danger"});
        }
    }

    _postToBridge(msg) {
        const win = this.iframeRef()?.contentWindow;
        if (win) {
            win.postMessage(msg, window.location.origin);
        }
    }

    // 画布变化（桥接页每500ms节流上报一次）
    onSceneUpdate(payload) {
        if (!payload) return;
        const next = {elements: payload.elements || [], files: payload.files || {}};
        if (this._isSameAsLoaded(next)) {
            return;
        }
        this._pending = next;
        this.hasUnsavedChange.set(true);
        clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => this.saveScene(true), AUTOSAVE_DELAY);
    }

    _isSameAsLoaded(next) {
        try {
            return JSON.stringify(next) === JSON.stringify(this._loaded);
        } catch {
            return false;
        }
    }

    // 手动保存（silent=true时为自动保存，不弹通知）
    async saveScene(silent = false) {
        if (!this.hasUnsavedChange() || this.isSaving()) return;
        const submit = this._pending || this._loaded;
        this.isSaving.set(true);
        clearTimeout(this._saveTimer);
        try {
            await this.orm.call("qs.mind.map", "set_excalidraw_data", [this.active_id, submit]);
            this._loaded = submit;
            this._pending = null;
            this.hasUnsavedChange.set(false);
            if (!silent) {
                this.notificationService.add(_t("Drawing saved"), {title: "OK", type: "success"});
            }
        } catch (err) {
            console.error("[qs_iframe] failed to save excalidraw data:", err);
            this.notificationService.add(_t("Failed to save drawing"), {title: String(err), type: "danger"});
        } finally {
            this.isSaving.set(false);
        }
    }

    // 组件卸载时尽力保存未落库的改动
    _flushSave() {
        if (this._pending && this.active_id) {
            this.orm.call("qs.mind.map", "set_excalidraw_data", [this.active_id, this._pending]).catch(() => {});
            this._pending = null;
        }
    }

    onReloadScene() {
        if (this.isBridgeReady()) {
            this._pushScene();
        }
    }

    _clearTimers() {
        clearTimeout(this._saveTimer);
        clearTimeout(this._readyTimer);
        this._saveTimer = null;
        this._readyTimer = null;
    }
}

registry.category("actions").add("qs_iframe.excalidraw", IframeExcalidraw);
