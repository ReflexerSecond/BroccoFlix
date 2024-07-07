class Pipette {
    static async pipetteVideoElements() {
        const videos = document.querySelectorAll('video');
        if (!this.removeOverlays()) {
            videos.forEach(video => {
                const overlay = document.createElement('div');

                overlay.style.position = 'absolute';
                overlay.style.top = `${video.offsetTop}px`;
                overlay.style.left = `${video.offsetLeft}px`;
                overlay.style.width = `${video.offsetWidth}px`;
                overlay.style.height = `${video.offsetHeight}px`;
                overlay.style.backgroundColor = 'rgba(0, 255, 0, 0.5)';
                overlay.style.pointerEvents = 'auto';
                overlay.style.zIndex = '9999';

                overlay.classList.add('broccoflix-overlay');

                video.parentNode.appendChild(overlay);

                overlay.onclick =  async () => {
                    let minimalSelector = SelectorManager.getMinimalElementSelector(video);
                    await utils.writeToBase("videoSelector", minimalSelector);
                    console.log(`Calculated selector for video: ${minimalSelector}`);
                    this.removeOverlays();
                };

                const updateOverlay = () => {
                    overlay.style.top = `${video.offsetTop}px`;
                    overlay.style.left = `${video.offsetLeft}px`;
                    overlay.style.width = `${video.offsetWidth}px`;
                    overlay.style.height = `${video.offsetHeight}px`;
                };

                video.addEventListener('resize', updateOverlay);
                window.addEventListener('resize', updateOverlay);
            });
        }
    }

    static removeOverlays() {
        const existedOverlays = document.querySelectorAll('.broccoflix-overlay');
        let found = existedOverlays.length > 0;
        if (existedOverlays.length > 0) {
            existedOverlays.forEach(overlay => {
                overlay.parentNode.removeChild(overlay);
            });
        }
        return found;
    }
}