/** @odoo-module **/
import { ImageField } from '@web/views/fields/image/image_field';
import { patch } from "@web/core/utils/patch";


function removeEnlargedImage() {
    const elements = [
        ".enlarged-image", ".blurred-bg", ".close-button", ".zoom-button",
        ".share-button", ".print-button", ".reset-button", ".download-button",
        ".fit-button", ".rotate-button"
    ];
    elements.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) document.body.removeChild(el);
    });
    document.body.classList.remove("enlarged-image-body");
}

function img_click(ev) {
    ev.stopPropagation();
    ev.preventDefault();
    
    const clickedImg = ev.target;
    if (!clickedImg || clickedImg.tagName !== 'IMG') return; 
    if (document.body.classList.contains("enlarged-image-body")) {
        removeEnlargedImage();
        return;
    }

    const newImg = document.createElement("img");
    const src = clickedImg.src;
    if (src.includes("avatar_128") && !src.includes("avatar_128.png")) {
        newImg.src = src.replace("avatar_128", "image_1920");
    } else if (src.includes("image_128") && !src.includes("image_128.png")) {
        newImg.src = src.replace("image_128", "image_1920");
    } else {
        newImg.src = src;
    }


    newImg.classList.add("enlarged-image");
    Object.assign(newImg.style, {
        position: "fixed",
        top: 0, bottom: 0, left: 0, right: 0,
        margin: "auto",
        maxWidth: "98%",
        maxHeight: "98%",
        zIndex: 10050,
        cursor: "move",
        transition: "transform 0.1s ease"
    });


    const blurredBg = document.createElement("div");
    blurredBg.classList.add("blurred-bg");
    Object.assign(blurredBg.style, {
        position: "fixed",
        top: 0, bottom: 0, left: 0, right: 0,
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(8px)",
        zIndex: 10049
    });


    const closeButton = createButton({
        className: "close-button",
        innerHTML: "❎",
        style: { top: "10px", right: "10px" },
        onClick: removeEnlargedImage
    });


    const zoomButton = createButton({
        className: "zoom-button",
        innerHTML: "🔍",
        style: { top: "10px", left: "10px" },
        onClick: () => {
            newImg.style.maxWidth = `${parseInt(newImg.style.maxWidth) + 30}%`;
            newImg.style.maxHeight = `${parseInt(newImg.style.maxHeight) + 30}%`;
        }
    });


    const shareButton = createButton({
        className: "share-button",
        innerHTML: "🔗",
        style: { top: "10px", left: "60px" },
        onClick: async () => {
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: "Shared Image",
                        text: "Check out this image!",
                        url: newImg.src
                    });
                } catch (err) {
                    console.error("Share failed:", err);
                }
            } else {
                alert("分享功能仅支持移动端/现代浏览器");
            }
        }
    });


    const resetButton = createButton({
        className: "reset-button",
        innerHTML: "🔄",
        style: { bottom: "10px", right: "10px" },
        onClick: () => {
            newImg.style.transform = "translate3d(0, 0, 0)";
            newImg.style.maxWidth = "98%";
            newImg.style.maxHeight = "98%";
            window.imgXOffset = 0;
            window.imgYOffset = 0;
            window.imgRotation = 0;
        }
    });


    const printButton = createButton({
        className: "print-button",
        innerHTML: "🖨️",
        style: { bottom: "10px", left: "10px" },
        onClick: () => {
            const printWindow = window.open("", "_blank");
            printWindow.document.write(`<img src="${newImg.src}" style="width:100%;"/>`);
            printWindow.document.close();
            printWindow.print();
        }
    });


    const fitButton = createButton({
        className: "fit-button",
        innerHTML: "🖥️",
        style: { bottom: "10px", left: "100px" },
        onClick: () => {
            newImg.style.maxWidth = "100vw";
            newImg.style.maxHeight = "100vh";
            newImg.style.width = "auto";
            newImg.style.height = "auto";
        }
    });

    const rotateButton = createButton({
        className: "rotate-button",
        innerHTML: "🕹️",
        style: { bottom: "10px", left: "50px" },
        onClick: () => {
            window.imgRotation = (window.imgRotation || 0) + 90;
            newImg.style.transform = `translate3d(${window.imgXOffset || 0}px, ${window.imgYOffset || 0}px, 0) rotate(${window.imgRotation}deg)`;
        }
    });


    const downloadButton = createButton({
        className: "download-button",
        innerHTML: "💾",
        style: { bottom: "10px", right: "50px" },
        onClick: () => {
            const a = document.createElement("a");
            a.href = newImg.src;
            a.download = `image_${new Date().getTime()}.jpg`;
            a.click();
            URL.revokeObjectURL(a.href);
        }
    });


    window.imgXOffset = 0;
    window.imgYOffset = 0;
    window.imgRotation = 0;
    window.imgIsDragging = false;

    const handleMouseDown = (e) => {
        window.imgIsDragging = true;
        window.imgInitialX = (e.clientX || e.touches[0].clientX) - window.imgXOffset;
        window.imgInitialY = (e.clientY || e.touches[0].clientY) - window.imgYOffset;
    };
    const handleMouseMove = (e) => {
        if (!window.imgIsDragging) return;
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        window.imgXOffset = clientX - window.imgInitialX;
        window.imgYOffset = clientY - window.imgInitialY;
        newImg.style.transform = `translate3d(${window.imgXOffset}px, ${window.imgYOffset}px, 0) rotate(${window.imgRotation || 0}deg)`;
    };
    const handleMouseUp = () => {
        window.imgIsDragging = false;
    };


    newImg.addEventListener("mousedown", handleMouseDown);
    newImg.addEventListener("touchstart", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("touchmove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchend", handleMouseUp);


    newImg.addEventListener("dblclick", () => {
        newImg.style.maxWidth = `${parseInt(newImg.style.maxWidth) + 30}%`;
        newImg.style.maxHeight = `${parseInt(newImg.style.maxHeight) + 30}%`;
    });


    blurredBg.addEventListener("click", removeEnlargedImage);


    const elements = [blurredBg, newImg, closeButton, zoomButton, shareButton,
        resetButton, printButton, fitButton, rotateButton, downloadButton];
    elements.forEach(el => document.body.appendChild(el));
    document.body.classList.add("enlarged-image-body");
}


function createButton({ className, innerHTML, style, onClick }) {
    const button = document.createElement("button");
    button.classList.add(className);
    button.innerHTML = innerHTML;
    Object.assign(button.style, {
        position: "fixed",
        padding: "8px 12px",
        background: "none",
        border: "none",
        borderRadius: "4px",
        color: "#fff",
        fontSize: "16px",
        zIndex: 10050,
        cursor: "pointer",
        transition: "background 0.2s"
    });
    Object.assign(button.style, style);
    button.addEventListener("click", (e) => {
        e.stopPropagation();
        onClick();
    });

    button.addEventListener("mouseenter", () => {
        button.style.background = "rgba(0,0,0,0.8)";
    });
    button.addEventListener("mouseleave", () => {
        button.style.background = "rgba(0,0,0,0.5)";
    });
    return button;
}


patch(ImageField.prototype, {
    setup() {
        super.setup();
        

        if (!window.imagePreviewListenerAdded) {
            window.imagePreviewListenerAdded = true;
            

            document.addEventListener('click', (ev) => {

                const imgContainer = ev.target.closest('div.d-inline-block.position-relative.opacity-trigger-hover');
                const isImageFieldImg = imgContainer && ev.target.tagName === 'IMG' && ev.target.hasAttribute('loading');
                
                if (isImageFieldImg) {
                    if (ev.target.hasAttribute('data-preview-clicked')) return;
                    ev.target.setAttribute('data-preview-clicked', 'true');
                    
                    ev.target.style.cursor = 'pointer';
                    
                    img_click(ev);
                    
                    setTimeout(() => {
                        ev.target.removeAttribute('data-preview-clicked');
                    }, 100);
                }
            }, true); 
        }
    },
});